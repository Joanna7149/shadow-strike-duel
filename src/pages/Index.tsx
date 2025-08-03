import React, { Suspense } from 'react';

const FightingGame = React.lazy(() => import('@/components/FightingGame'));

function Index() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FightingGame />
    </Suspense>
  );
}

export default Index;
