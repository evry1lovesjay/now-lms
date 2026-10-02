import { accounts } from "../../tests/support/accounts";

// window.confirm() (shown by "Block") is auto-accepted by Cypress.

describe("User management — super admin", () => {
  it("can block content admins, tutors and students, but not themselves", () => {
    cy.login("superadmin");
    cy.visit("/admin/users");
    [accounts.contentAdmin.email, accounts.tutor.email, accounts.student.email].forEach((email) => {
      cy.userRow(email).contains("button", "Block");
    });
    cy.userRow(accounts.superadmin.email).find("button").should("not.exist");
  });

  it("can create content admin, tutor and student accounts", () => {
    cy.login("superadmin");
    cy.visit("/admin/users");
    cy.get("#role option").then(($o) => {
      expect([...$o].map((o) => o.textContent)).to.deep.equal(["Content Admin", "Tutor", "Student"]);
    });

    cy.get("#name").type("Second Content Admin");
    cy.get("#email").type("content2@nowlms.local");
    cy.get("#password").type("Password123!");
    cy.get("#role").select("CONTENT_ADMIN");
    cy.contains("button", "Add user").click();

    cy.contains("Second Content Admin was added.");
    cy.userRow("content2@nowlms.local").should("contain", "Content Admin");
  });

  it("blocks a content admin (locking them out) and unblocks them", () => {
    cy.login("superadmin");
    cy.visit("/admin/users");
    cy.userRow(accounts.contentAdmin.email).contains("button", "Block").click();
    cy.userRow(accounts.contentAdmin.email).should("contain", "Blocked");

    cy.logoutAll();
    cy.attemptLogin(accounts.contentAdmin.email, accounts.contentAdmin.password);
    cy.contains("This account has been disabled");

    cy.login("superadmin");
    cy.visit("/admin/users");
    cy.userRow(accounts.contentAdmin.email).contains("button", "Unblock").click();
    cy.userRow(accounts.contentAdmin.email).should("contain", "Active");

    cy.logoutAll();
    cy.login("contentAdmin");
    cy.location("pathname").should("eq", "/admin");
  });

  it("signs out an already logged-in user as soon as they are blocked", () => {
    cy.login("contentAdmin");
    cy.getCookie("lms_session").then((contentSession) => {
      cy.logoutAll();
      cy.login("superadmin");
      cy.visit("/admin/users");
      cy.userRow(accounts.contentAdmin.email).contains("button", "Block").click();
      cy.userRow(accounts.contentAdmin.email).should("contain", "Blocked");

      // Resume the content admin's original session: it is no longer accepted.
      cy.logoutAll();
      cy.setCookie("lms_session", contentSession!.value);
      cy.visit("/admin/users");
      cy.location("pathname").should("eq", "/login");

      // Unblocking does not bring the revoked session back.
      cy.logoutAll();
      cy.login("superadmin");
      cy.visit("/admin/users");
      cy.userRow(accounts.contentAdmin.email).contains("button", "Unblock").click();
      cy.userRow(accounts.contentAdmin.email).should("contain", "Active");
      cy.logoutAll();
      cy.setCookie("lms_session", contentSession!.value);
      cy.visit("/admin");
      cy.location("pathname").should("eq", "/login");
    });
  });

  it("records block actions in the audit log", () => {
    cy.login("superadmin");
    cy.visit("/admin/users");
    cy.userRow(accounts.tutor.email).contains("button", "Block").click();
    cy.userRow(accounts.tutor.email).should("contain", "Blocked");

    cy.visit("/admin/audit");
    cy.contains("tr", "user.block").should("contain", accounts.tutor.email);
  });
});

describe("User management — content admin", () => {
  it("can block tutors and students, but not super admins or content admins", () => {
    cy.login("contentAdmin");
    cy.visit("/admin/users");
    cy.userRow(accounts.tutor.email).contains("button", "Block");
    cy.userRow(accounts.student.email).contains("button", "Block");
    cy.userRow(accounts.superadmin.email).find("button").should("not.exist");
    cy.userRow(accounts.contentAdmin.email).find("button").should("not.exist");
  });

  it("can only create tutor and student accounts", () => {
    cy.login("contentAdmin");
    cy.visit("/admin/users");
    cy.get("#role option").then(($o) => {
      expect([...$o].map((o) => o.textContent)).to.deep.equal(["Tutor", "Student"]);
    });
  });

  it("locks out tutors and students they block", () => {
    cy.login("contentAdmin");
    cy.visit("/admin/users");
    [accounts.tutor.email, accounts.student.email].forEach((email) => {
      cy.userRow(email).contains("button", "Block").click();
      cy.userRow(email).should("contain", "Blocked");
    });

    [accounts.tutor, accounts.student].forEach(({ email, password }) => {
      cy.logoutAll();
      cy.attemptLogin(email, password);
      cy.contains("This account has been disabled");
    });
  });

  it("filters the user list by status", () => {
    cy.login("contentAdmin");
    cy.visit("/admin/users");
    cy.userRow(accounts.student.email).contains("button", "Block").click();
    cy.userRow(accounts.student.email).should("contain", "Blocked");

    cy.visit("/admin/users?status=BLOCKED");
    cy.get("tbody tr").should("have.length", 1).and("contain", accounts.student.email);
  });
});
