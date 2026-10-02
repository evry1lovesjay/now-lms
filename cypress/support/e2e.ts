import "./commands";

// Every test starts from the same seeded database.
beforeEach(() => {
  cy.task("db:reset");
});
