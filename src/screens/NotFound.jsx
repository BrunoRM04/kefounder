import React from 'react';
import { Compass } from 'lucide-react';
import { Page, TopBar } from '../components/Shell.jsx';
import { Button, EmptyState } from '../components/ui.jsx';
import { useRouter } from '../lib/router.jsx';

export default function NotFound() {
  const { navigate } = useRouter();
  return (
    <>
      <TopBar back="/" title="Página no encontrada" />
      <Page width="sm">
        <EmptyState icon={<Compass size={22} />} title="Esta página no existe" text="Puede que el enlace esté roto o que el contenido ya no esté disponible." action={<Button onClick={() => navigate('/')}>Ir a descubrir</Button>} />
      </Page>
    </>
  );
}
