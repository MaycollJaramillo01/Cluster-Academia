'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Selector } from '@astryxdesign/core/Selector';

type Country = { code: string; name: string; prefix: string };

export function PhoneCountrySelector({ countries, initialCountry }: {
  countries: Country[];
  initialCountry: string;
}) {
  const [country, setCountry] = useState(initialCountry);
  const options = countries.map(({ code, name, prefix }) => ({
    value: code,
    label: `${name} (+${prefix})`,
  }));
  const renderCountry = (option: { value: string; label?: string }) => (
    <HStack gap={2} align="center" className="min-w-0">
      <Image src={`/flags/${option.value}.svg`} alt="" width={24} height={16} className="h-4 w-6 shrink-0 rounded-sm object-cover" />
      <Text className="truncate">{option.label}</Text>
    </HStack>
  );

  return (
    <Selector
      label="País"
      htmlName="phone_country"
      value={country}
      onChange={setCountry}
      options={options}
      hasSearch
      searchPlaceholder="Buscar país o prefijo…"
      emptySearchText="No encontramos ese país."
      presentation="popover"
      size="lg"
      containerClassName="w-full min-w-0"
      controlClassName="min-h-12"
      renderOption={renderCountry}
      renderValue={renderCountry}
    />
  );
}
