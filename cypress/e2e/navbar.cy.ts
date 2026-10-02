const current = () => cy.get('nav[aria-label="Main"] [aria-current="page"]');
const navLabels = () =>
  cy.get('nav[aria-label="Main"] li').then(($li) => [...$li].map((li) => li.textContent?.trim()));

describe("Navbar", () => {
  it("puts Dashboard before Courses and highlights the current page", () => {
    cy.login("student");
    navLabels().should("deep.equal", ["Dashboard", "Courses", "Assignments"]);
    current().should("have.text", "Dashboard");

    cy.visit("/courses/software-quality-assurance");
    current().should("have.text", "Courses");

    // The most specific link wins: /student/assignments highlights Assignments, not Dashboard.
    cy.visit("/student/assignments");
    current().should("have.text", "Assignments");

    current().then(($active) => {
      cy.get('nav[aria-label="Main"] a:not([aria-current])')
        .contains("Courses")
        .then(($other) => {
          expect(getComputedStyle($active[0]).backgroundColor).not.to.eq(getComputedStyle($other[0]).backgroundColor);
        });
    });
  });

  it("shows Dashboard, Courses and Users to admins", () => {
    cy.login("superadmin");
    navLabels().should("deep.equal", ["Dashboard", "Courses", "Users"]);
    cy.visit("/admin/users");
    current().should("have.text", "Users");
  });

  it("shows the first name above a smaller role", () => {
    cy.login("tutor"); // "Demo Tutor"
    cy.get('[data-testid="nav-user"] span').then(($spans) => {
      const [name, role] = [$spans[0], $spans[1]];
      expect(name.textContent).to.eq("Demo");
      expect(role.textContent).to.match(/tutor/i);
      expect(role.getBoundingClientRect().top).to.be.greaterThan(name.getBoundingClientRect().bottom - 2);
      expect(parseFloat(getComputedStyle(role).fontSize)).to.be.lessThan(parseFloat(getComputedStyle(name).fontSize));
    });
  });
});

export {};
