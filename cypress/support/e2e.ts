import "./commands";

// Every test starts from the same seeded database.
beforeEach(() => {
  cy.task("db:reset");
});

// Uncaught app errors still fail the test, but the report says where they happened.
// Production React errors (e.g. #418 hydration mismatches) carry no detail of their own.
Cypress.on("uncaught:exception", (err) => {
  const win = (Cypress as unknown as { state(key: "window"): Window | undefined }).state("window");
  if (win) {
    err.message += `\n\nPage: ${win.location.href}\n<head> starts with: ${win.document.head?.innerHTML.slice(0, 400)}`;
  }
  return true;
});
