import { accounts, type AccountName } from "../../tests/support/accounts";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Signs in through the login form as a seeded account or explicit credentials. */
      login(who: AccountName | { email: string; password: string }): Chainable<void>;
      /** Fills the login form without asserting success. */
      attemptLogin(email: string, password: string): Chainable<void>;
      /** Clears the session cookie so the next login starts fresh. */
      logoutAll(): Chainable<void>;
      /** The users-table row containing this email. */
      userRow(email: string): Chainable<JQuery<HTMLTableRowElement>>;
      /** Enrolls the signed-in student in Software Quality Assurance. */
      enrollInSqa(): Chainable<void>;
      /** Opens the seeded SQA video lesson and yields the <video> src. */
      openSeededLesson(): Chainable<string>;
    }
  }
}

Cypress.Commands.add("attemptLogin", (email, password) => {
  cy.visit("/login");
  cy.get("#email").type(email);
  cy.get("#password").type(password, { log: false });
  cy.contains("button", "Sign in").click();
});

Cypress.Commands.add("login", (who) => {
  const { email, password } = typeof who === "string" ? accounts[who] : who;
  cy.attemptLogin(email, password);
  cy.location("pathname").should("not.eq", "/login");
});

Cypress.Commands.add("logoutAll", () => {
  cy.clearAllCookies();
});

Cypress.Commands.add("userRow", (email) => {
  return cy.contains("tbody tr", email);
});

Cypress.Commands.add("enrollInSqa", () => {
  cy.visit("/courses/software-quality-assurance");
  cy.contains("button", "Enroll in this course").click();
  cy.contains("button", "Enroll in this course").should("not.exist");
});

Cypress.Commands.add("openSeededLesson", () => {
  cy.contains("a", "Seeded video lesson").click();
  return cy
    .get("video")
    .invoke("attr", "src")
    .should("match", /^\/api\/videos\/.+\?t=/)
    .then((src) => String(src));
});

export {};
