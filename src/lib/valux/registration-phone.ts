import { getCountries, getCountryCallingCode, parsePhoneNumber } from 'libphonenumber-js/core';
import metadata from 'libphonenumber-js/metadata.min.json';
import { cleanPhone } from './login';

const regionNames = new Intl.DisplayNames('es', { type: 'region' });

export const phoneCountries = getCountries(metadata)
  .map(code => ({ code, name: regionNames.of(code) || code, prefix: getCountryCallingCode(code, metadata) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));

export function defaultPhoneCountry(location: string | null) {
  return phoneCountries.find(({ code }) => code === location)?.code ?? 'HN';
}

export function registrationPhone(phone: string, country: string) {
  if (!country) return cleanPhone(phone);
  const selectedCountry = phoneCountries.find(({ code }) => code === country);
  if (!selectedCountry) return '';
  const number = parsePhoneNumber(phone, { defaultCountry: selectedCountry.code, extract: false }, metadata);
  return number?.isPossible() ? number.number : '';
}
