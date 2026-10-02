describe("Authentication & routing", () => {
  it("lets a visitor register as a student", () => {
    cy.visit("/register");
    cy.get("#name").type("New Learner");
    cy.get("#email").type("new.learner@example.com");
    cy.get("#password").type("Secret123!");
    cy.contains("button", "Create student account").click();

    cy.location("pathname").should("eq", "/student");
    cy.contains("Hi New");
    cy.get('[data-testid="nav-user"]').invoke("text").should("match", /^New\s*Student$/);
  });

  it("rejects registering with an existing email", () => {
    cy.visit("/register");
    cy.get("#name").type("Copycat");
    cy.get("#email").type("student@nowlms.local");
    cy.get("#password").type("Secret123!");
    cy.contains("button", "Create student account").click();
    cy.contains("An account with this email already exists.");
  });

  it("shows an error for a wrong password", () => {
    cy.attemptLogin("student@nowlms.local", "wrong-password");
    cy.contains("Invalid email or password.");
  });

  it("sends each role to its own dashboard", () => {
    const homes = { superadmin: "/admin", contentAdmin: "/admin", tutor: "/tutor", student: "/student" } as const;
    (Object.keys(homes) as (keyof typeof homes)[]).forEach((who) => {
      cy.logoutAll();
      cy.login(who);
      cy.location("pathname").should("eq", homes[who]);
    });
  });

  it("redirects anonymous visitors to login from protected pages", () => {
    ["/admin", "/admin/users", "/tutor", "/student"].forEach((path) => {
      cy.visit(path);
      cy.location("pathname").should("eq", "/login");
    });
  });

  it("keeps students and tutors out of the admin area", () => {
    cy.login("student");
    cy.visit("/admin/users");
    cy.location("pathname").should("eq", "/student");

    cy.logoutAll();
    cy.login("tutor");
    cy.visit("/admin");
    cy.location("pathname").should("eq", "/tutor");
  });

  it("hides the audit log from content admins", () => {
    cy.login("contentAdmin");
    cy.contains("a", "Audit log").should("not.exist");
    cy.visit("/admin/audit");
    cy.location("pathname").should("eq", "/admin");
  });
});
