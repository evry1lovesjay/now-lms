function visitWithSystemTheme(path: string, dark: boolean) {
  cy.visit(path, {
    onBeforeLoad(win) {
      const real = win.matchMedia.bind(win);
      cy.stub(win, "matchMedia").callsFake((query: string) =>
        query === "(prefers-color-scheme: dark)" ? { ...real(query), matches: dark, addEventListener() {}, removeEventListener() {} } : real(query),
      );
    },
  });
}

const htmlIsDark = () => cy.get("html").then(($h) => $h.hasClass("dark"));

describe("Dark mode", () => {
  it("cycles System → Light → Dark and remembers the choice", () => {
    visitWithSystemTheme("/", false);
    cy.get('button[aria-label^="Theme:"]').as("toggle").should("contain", "System");
    htmlIsDark().should("eq", false);

    cy.get("@toggle").click();
    cy.get("@toggle").should("contain", "Light");
    htmlIsDark().should("eq", false);

    cy.get("@toggle").click();
    cy.get("@toggle").should("contain", "Dark");
    htmlIsDark().should("eq", true);
    cy.window().then((win) => expect(win.localStorage.getItem("theme")).to.eq("dark"));

    cy.reload();
    htmlIsDark().should("eq", true);
    cy.get('button[aria-label^="Theme:"]').should("contain", "Dark");
  });

  it("follows the operating system preference on System", () => {
    visitWithSystemTheme("/", true);
    htmlIsDark().should("eq", true);
  });
});

export {};
