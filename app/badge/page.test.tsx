import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import BadgePage from './page'

const mockShow = jest.fn()

jest.mock('@/lib/toast', () => ({
  useToast: () => ({ show: mockShow }),
}))

const mockWriteText = jest.fn()

beforeEach(() => {
  mockShow.mockClear()
  mockWriteText.mockReset()
  mockWriteText.mockResolvedValue(undefined)

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: mockWriteText },
  })
})

describe('BadgePage', () => {
  it('generates markdown with the selected badge status, contract ID, and network', async () => {
    render(<BadgePage />)

    expect(screen.getByRole('img', { name: /soroban guard badge preview/i })).toHaveAttribute(
      'src',
      'https://img.shields.io/badge/Soroban%20Guard-passing-brightgreen',
    )
    expect(
      screen.getByText(
        '[![Soroban Guard](https://img.shields.io/badge/Soroban%20Guard-passing-brightgreen)](https://soroban-guard.veritas-vaults.network)',
      ),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/contract id/i), { target: { value: ' cabc test ' } })
    await userEvent.selectOptions(screen.getByLabelText(/network/i), 'mainnet')
    await userEvent.selectOptions(screen.getByLabelText(/badge status/i), 'warnings')

    expect(screen.getByRole('img', { name: /soroban guard badge preview/i })).toHaveAttribute(
      'src',
      'https://img.shields.io/badge/Soroban%20Guard-warnings-yellow',
    )
    expect(
      screen.getByText(
        '[![Soroban Guard](https://img.shields.io/badge/Soroban%20Guard-warnings-yellow)](https://soroban-guard.veritas-vaults.network/?contractId=CABC%20TEST&network=mainnet)',
      ),
    ).toBeInTheDocument()
  })

  it('copies the generated markdown to the clipboard and shows a success toast', async () => {
    render(<BadgePage />)

    fireEvent.change(screen.getByLabelText(/contract id/i), { target: { value: ' cxyz ' } })
    await userEvent.selectOptions(screen.getByLabelText(/network/i), 'futurenet')
    await userEvent.selectOptions(screen.getByLabelText(/badge status/i), 'failing')
    await userEvent.click(screen.getByRole('button', { name: /copy/i }))

    await waitFor(() =>
      expect(mockWriteText).toHaveBeenCalledWith(
        '[![Soroban Guard](https://img.shields.io/badge/Soroban%20Guard-failing-red)](https://soroban-guard.veritas-vaults.network/?contractId=CXYZ&network=futurenet)',
      ),
    )
    expect(mockShow).toHaveBeenCalledWith('Markdown copied!', 'success')
  })
})
