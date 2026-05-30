import { exportSarif } from '@/lib/sarif'
import type { Finding } from '@/types/findings'

const findings: Finding[] = [
  {
    check_name: 'unchecked-auth',
    severity: 'Critical',
    file_path: 'src/lib.rs',
    line: 42,
    function_name: 'transfer',
    description: 'Authorization is not verified.',
    remediation: 'Add auth check.',
  },
  {
    check_name: 'integer-overflow',
    severity: 'Medium',
    file_path: 'src/lib.rs',
    line: 85,
    function_name: 'add_balance',
    description: 'Integer overflow possible.',
  },
  {
    check_name: 'unchecked-auth',
    severity: 'High',
    file_path: 'src/other.rs',
    line: 10,
    function_name: 'approve',
    description: 'Auth missing in approve.',
  },
]

describe('exportSarif', () => {
  it('returns valid JSON string', () => {
    expect(() => JSON.parse(exportSarif(findings))).not.toThrow()
  })

  it('conforms to SARIF 2.1.0 schema version and $schema', () => {
    const sarif = JSON.parse(exportSarif(findings))
    expect(sarif.version).toBe('2.1.0')
    expect(sarif.$schema).toContain('sarif-schema-2.1.0')
  })

  it('produces a single run with a named driver', () => {
    const sarif = JSON.parse(exportSarif(findings))
    expect(sarif.runs).toHaveLength(1)
    expect(sarif.runs[0].tool.driver.name).toBe('Soroban Guard')
  })

  it('deduplicates rules by check_name', () => {
    const sarif = JSON.parse(exportSarif(findings))
    const rules = sarif.runs[0].tool.driver.rules
    const ids = rules.map((r: { id: string }) => r.id)
    expect(ids).toHaveLength(new Set(ids).size)
    expect(ids).toContain('unchecked-auth')
    expect(ids).toContain('integer-overflow')
    expect(ids).toHaveLength(2)
  })

  it('maps Critical/High severity to error level', () => {
    const sarif = JSON.parse(exportSarif(findings))
    const results = sarif.runs[0].results
    const critical = results.find((r: { ruleId: string; level: string }) => r.ruleId === 'unchecked-auth' && r.level === 'error')
    expect(critical).toBeDefined()
  })

  it('maps Medium severity to warning level', () => {
    const sarif = JSON.parse(exportSarif(findings))
    const results = sarif.runs[0].results
    const medium = results.find((r: { ruleId: string }) => r.ruleId === 'integer-overflow')
    expect(medium.level).toBe('warning')
  })

  it('maps Low/Info severity to note level', () => {
    const lowFinding: Finding = {
      check_name: 'unused-var',
      severity: 'Low',
      file_path: 'src/lib.rs',
      line: 5,
      function_name: 'init',
      description: 'Unused variable.',
    }
    const sarif = JSON.parse(exportSarif([lowFinding]))
    expect(sarif.runs[0].results[0].level).toBe('note')
  })

  it('includes correct physical location for each result', () => {
    const sarif = JSON.parse(exportSarif(findings))
    const result = sarif.runs[0].results[0]
    const loc = result.locations[0].physicalLocation
    expect(loc.artifactLocation.uri).toBe('src/lib.rs')
    expect(loc.artifactLocation.uriBaseId).toBe('%SRCROOT%')
    expect(loc.region.startLine).toBe(42)
  })

  it('includes logical location with function name', () => {
    const sarif = JSON.parse(exportSarif(findings))
    const logicalLoc = sarif.runs[0].results[0].locations[0].logicalLocations[0]
    expect(logicalLoc.name).toBe('transfer')
    expect(logicalLoc.kind).toBe('function')
  })

  it('produces empty results array for empty findings', () => {
    const sarif = JSON.parse(exportSarif([]))
    expect(sarif.runs[0].results).toHaveLength(0)
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(0)
  })

  it('result count matches findings count', () => {
    const sarif = JSON.parse(exportSarif(findings))
    expect(sarif.runs[0].results).toHaveLength(findings.length)
  })
})
