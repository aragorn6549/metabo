// NumberInput — копия 1:1 из прототипа (§8.7 «NumberInput»).
import { useEffect, useState } from 'react';

interface Props {
  value: number | '' ;
  onChange: (v: number | '') => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function NumberInput({ value, onChange, placeholder, className, style, ...rest }: Props) {
  const [raw, setRaw] = useState<string>(() => {
    if (value === '' || value == null) return '';
    return String(value).replace('.', ',');
  });
  useEffect(() => {
    const normalized = raw.replace(',', '.');
    const parsed = normalized === '' ? NaN : parseFloat(normalized);
    const parsedIsInvalid = Number.isNaN(parsed);
    if (parsed !== value && !(parsedIsInvalid && (value === '' || value == null))) {
      setRaw(value === '' || value == null ? '' : String(value).replace('.', ','));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v !== '' && !/^-?\d*([.,]\d*)?$/.test(v)) return;
    setRaw(v);
    if (v === '' || v === '-' || v === '.' || v === ',' || v === '-.' || v === '-,') {
      if (v === '') onChange('');
      return;
    }
    const num = parseFloat(v.replace(',', '.'));
    if (!Number.isNaN(num)) onChange(num);
  };
  return (
    <input type="text" inputMode="decimal" value={raw} onChange={handleChange}
      placeholder={placeholder} className={className} style={style} {...rest} />
  );
}
