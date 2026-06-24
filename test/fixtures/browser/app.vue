<template>
  <main class="fixture">
    <PerfectScrollbar
      data-testid="component-scroll"
      class="scroll-box"
      theme="browser"
      :options="{ wheelPropagation: false, minScrollbarLength: 36 }"
    >
      <section
        data-testid="component-content"
        class="scroll-content"
      >
        <h1>Browser fixture</h1>
        <PerfectScrollbar
          data-testid="nested-perfect-scroll"
          class="nested-perfect-scroll"
          :options="{ wheelPropagation: false }"
        >
          <div class="nested-perfect-content">
            Nested perfect scrollbar content
          </div>
        </PerfectScrollbar>
        <div
          data-testid="nested-scroll"
          class="nested-scroll"
        >
          <div class="nested-content">
            Nested content
          </div>
        </div>
      </section>
    </PerfectScrollbar>

    <div
      v-perfect-scrollbar="{ theme: 'browser', options: { suppressScrollX: true } }"
      data-testid="directive-scroll"
      class="scroll-box directive-box"
    >
      <div class="directive-content">
        Directive content
      </div>
    </div>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: Arial, sans-serif;
}

.fixture {
  display: grid;
  gap: 24px;
  padding: 24px;
}

.scroll-box {
  --nps-rail-size: 14px;
  --nps-rail-visible-opacity: 0.65;
  --nps-rail-active-opacity: 1;
  --nps-rail-hover-color: rgb(209 250 229 / 90%);
  --nps-thumb-color: rgb(13 148 136 / 75%);
  --nps-thumb-hover-color: rgb(225 29 72 / 90%);
  --nps-thumb-size: 6px;
  --nps-thumb-hover-size: 10px;
  border: 1px solid rgb(15 23 42 / 20%);
  height: 180px;
  width: 320px;
}

.scroll-content {
  background: linear-gradient(135deg, rgb(236 253 245), rgb(219 234 254));
  box-sizing: border-box;
  height: 760px;
  padding: 18px;
  width: 680px;
}

.nested-scroll {
  background: rgb(255 255 255 / 75%);
  border: 1px solid rgb(15 23 42 / 20%);
  height: 86px;
  margin-top: 18px;
  overflow: auto;
  width: 210px;
}

.nested-perfect-scroll {
  background: rgb(255 255 255 / 75%);
  border: 1px solid rgb(15 23 42 / 20%);
  height: 86px;
  width: 210px;
}

.nested-perfect-content {
  height: 260px;
  padding: 12px;
}

.nested-content {
  height: 260px;
  padding: 12px;
}

.directive-box {
  height: 160px;
}

.directive-content {
  background: linear-gradient(180deg, rgb(254 249 195), rgb(254 226 226));
  height: 540px;
  width: 640px;
}
</style>
