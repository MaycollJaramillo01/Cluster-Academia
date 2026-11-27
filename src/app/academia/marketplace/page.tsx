import { permanentRedirect } from 'next/navigation';

export default function MarketplacePage() {
  permanentRedirect('/academia?vista=catalogo#recursos');
}
