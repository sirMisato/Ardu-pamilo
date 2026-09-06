<template>
  <div class="relative min-h-screen overflow-hidden bg-broken-white text-slate-800">
    <div class="pointer-events-none fixed inset-0 opacity-80" aria-hidden="true">
      <div
        class="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(120deg,rgba(134,239,172,0.30),rgba(45,212,191,0.18),transparent_70%)] blur-3xl"
      ></div>
      <div
        class="absolute inset-x-0 bottom-0 h-80 bg-[linear-gradient(300deg,rgba(45,212,191,0.18),rgba(167,243,208,0.22),transparent_68%)] blur-3xl"
      ></div>
    </div>

    <div class="relative z-10 min-h-screen">
      <RouterView />
    </div>
  </div>
</template>
