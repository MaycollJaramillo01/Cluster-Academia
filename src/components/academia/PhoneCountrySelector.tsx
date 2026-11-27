'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { Popover } from '@astryxdesign/core/Popover';
import { Icon } from '@/components/ui/Icon';

type Country = { code: string; name: string; prefix: string };
const nearby = ['HN', 'NI', 'CR', 'SV', 'GT', 'PA', 'MX', 'US'];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function PhoneCountrySelector({ countries, initialCountry }: {
  countries: Country[];
  initialCountry: string;
}) {
  const [code, setCode] = useState(initialCountry);
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = countries.find(country => country.code === code) || countries[0];
  const preferred = [selected.code, ...nearby.filter(country => country !== selected.code)];
  const matches = countries.filter(country => normalize(`${country.name} ${country.code} +${country.prefix}`).includes(normalize(query.trim())));
  const options = query.trim() ? matches : [
    ...preferred.flatMap(code => countries.filter(country => country.code === code)),
    ...countries.filter(country => !preferred.includes(country.code)),
  ];

  function changeOpen(open: boolean) {
    setOpen(open);
    setQuery('');
  }

  return (
    <VStack gap={0}>
      <label htmlFor="phone" className="mb-2 block text-sm font-semibold">WhatsApp</label>
      <HStack gap={0} align="center" className="academy-field w-full p-0 focus-within:ring-2 focus-within:ring-academy-primary">
        <input type="hidden" name="phone_country" value={selected.code} />
        <Popover label="Seleccionar país" isOpen={isOpen} onOpenChange={changeOpen} padding={2}
          content={
            <VStack gap={2} className="w-72 max-w-full">
              <HStack gap={2} align="center" className="rounded-md border border-academy-line px-3 focus-within:border-academy-primary">
                <Icon name="search" size={16} aria-hidden="true" className="shrink-0 text-academy-muted" />
                <input type="search" aria-label="Buscar país o prefijo" value={query} onChange={event => setQuery(event.target.value)}
                  placeholder="Buscar país o prefijo" autoComplete="off"
                  className="min-h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
                  onKeyDown={event => {
                    if (event.key !== 'ArrowDown') return;
                    event.currentTarget.parentElement?.nextElementSibling?.querySelector('button')?.focus();
                    event.preventDefault();
                  }} />
              </HStack>
              <VStack gap={0} className="max-h-56 overflow-y-auto overscroll-contain" onKeyDown={event => {
                if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
                const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
                const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
                buttons[(next + buttons.length) % buttons.length]?.focus();
                event.preventDefault();
              }}>
                {options.map(country => (
                  <button key={country.code} type="button" aria-pressed={country.code === selected.code}
                    className="academy-focus flex min-h-10 w-full items-center gap-3 rounded-md px-2 text-left text-sm hover:bg-academy-bg focus-visible:bg-academy-bg"
                    onClick={() => { setCode(country.code); changeOpen(false); }}>
                    <Image src={`/flags/${country.code}.svg`} alt="" width={24} height={16} className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                    <Text className="min-w-0 flex-1 truncate">{country.name}</Text>
                    <Text className="shrink-0 text-academy-muted">+{country.prefix}</Text>
                    {country.code === selected.code ? <Icon name="check" size={16} aria-hidden="true" /> : null}
                  </button>
                ))}
                {options.length === 0 ? <Text className="px-2 py-3 text-sm text-academy-muted" role="status">No encontramos ese país.</Text> : null}
              </VStack>
            </VStack>
          }>
          <button type="button" aria-label={`Cambiar país, ${selected.name} (+${selected.prefix})`}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-l-academy border-r border-academy-line px-3 text-sm focus:outline-none">
            <Image src={`/flags/${selected.code}.svg`} alt="" width={24} height={16} className="h-4 w-6 rounded-sm object-cover" />
            <Text>+{selected.prefix}</Text>
            <Icon name="chevron-down" size={14} aria-hidden="true" />
          </button>
        </Popover>
        <input id="phone" name="phone" type="tel" required autoComplete="tel-national" placeholder="Número de WhatsApp"
          className="min-h-11 min-w-0 flex-1 rounded-r-academy bg-transparent px-3 text-base outline-none" />
      </HStack>
    </VStack>
  );
}
