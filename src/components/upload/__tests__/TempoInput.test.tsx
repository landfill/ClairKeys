import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import TempoInput from '../TempoInput'
import { quarterBpm, type TempoUnit } from '@/utils/tempoInput'

function Form() {
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<TempoUnit>('quarter')
  return <><TempoInput value={value} unit={unit} onChange={setValue} onUnitChange={setUnit} />
    <output data-testid="quarter">{value ? quarterBpm(value, unit) : 'auto'}</output></>
}

it('keeps automatic reading until the user chooses a tempo and names the note unit', () => {
  render(<Form />)
  expect(screen.getByTestId('quarter')).toHaveTextContent('auto')
  expect(screen.getByText(/악보의 빠르기를 자동으로 읽습니다/)).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('박 단위'), { target: { value: 'dotted-quarter' } })
  fireEvent.change(screen.getByLabelText('빠르기 (BPM)'), { target: { value: '46' } })
  expect(screen.getByTestId('quarter')).toHaveTextContent('69')
  fireEvent.change(screen.getByRole('slider'), { target: { value: '60' } })
  expect(screen.getByTestId('quarter')).toHaveTextContent('90')
})

it('uses decimal text entry so browser wheel spinbuttons cannot change the tempo', () => {
  render(<Form />)
  const input = screen.getByLabelText('빠르기 (BPM)')
  expect(input).toHaveAttribute('type', 'text')
  expect(input).toHaveAttribute('inputmode', 'decimal')
  fireEvent.change(input, { target: { value: '72' } })
  fireEvent.wheel(input, { deltaY: 100 })
  expect(input).toHaveValue('72')
})
