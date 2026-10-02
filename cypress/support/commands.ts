import { accounts, type AccountName } from "../../tests/support/accounts";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Signs in through the login form as a seeded account or explicit credentials. */
      login(who: AccountName | { email: string; password: string }): Chainable<void>;
      /**
       * Gets an element once React has hydrated it (its event handlers are attached).
       * Clicking a server-rendered button before that does nothing.
       */
      hydrated(selector: string): Chainable<JQuery<HTMLElement>>;
      /** Fills the login form without asserting success. */
      attemptLogin(email: string, password: string): Chainable<void>;
      /** Clears the session cookie so the next login starts fresh. */
      logoutAll(): Chainable<void>;
      /** The users-table row containing this email. */
      userRow(email: string): Chainable<JQuery<HTMLTableRowElement>>;
      /** Enrolls the signed-in student in Software Quality Assurance. */
      enrollInSqa(): Chainable<void>;
      /** Enrolls the signed-in student in the course with this slug. */
      enrollIn(slug: string): Chainable<void>;
      /** Registers a new student account and signs in as them. */
      registerStudent(name: string, email: string): Chainable<void>;
      /** Posts an item to a course section using the course page composer. */
      postContent(sectionKey: "OUTLINE" | "MATERIALS" | "RESOURCES", item: { title: string; url?: string; file?: string }): Chainable<void>;
      /** Opens the seeded SQA video lesson and yields the <video> src. */
      openSeededLesson(): Chainable<string>;
    }
  }
}

Cypress.Commands.add("hydrated", (selector) =>
  cy.get(selector).should(($el) => {
    expect(
      Object.keys($el[0]).some((key) => key.startsWith("__reactProps$")),
      `${selector} is hydrated`,
    ).to.equal(true);
  }),
);

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
  cy.enrollIn("software-quality-assurance");
});

Cypress.Commands.add("enrollIn", (slug) => {
  cy.visit(`/courses/${slug}`);
  cy.contains("button", "Enroll in this course").click();
  cy.contains("button", "Enroll in this course").should("not.exist");
});

Cypress.Commands.add("registerStudent", (name, email) => {
  cy.visit("/register");
  cy.get("#name").type(name);
  cy.get("#email").type(email);
  cy.get("#password").type("Secret123!");
  cy.contains("button", "Create student account").click();
  cy.location("pathname").should("eq", "/student");
});

Cypress.Commands.add("postContent", (sectionKey, item) => {
  cy.get('[data-testid="content-composer"]').within(() => {
    cy.get("#content-section").select(sectionKey);
    if (item.file) cy.contains("label", "Upload a file").find("input").check();
    cy.get("#content-title").type(item.title);
    if (item.url) cy.get("#content-url").type(item.url);
    if (item.file) cy.get("#content-file").selectFile(item.file);
    cy.contains("button", /^Add to/).click();
  });
  cy.contains("[data-section] a", item.title);
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
