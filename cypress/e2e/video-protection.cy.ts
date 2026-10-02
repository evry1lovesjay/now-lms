import { accounts } from "../../tests/support/accounts";

const AS_MEDIA = { "sec-fetch-dest": "video" };

describe("Video protection", () => {
  it("streams ranges with no-store, inline headers", () => {
    cy.login("student");
    cy.enrollInSqa();
    cy.openSeededLesson().then((src) => {
      cy.request({ url: src, headers: { ...AS_MEDIA, range: "bytes=0-" } }).then((res) => {
        expect(res.status).to.eq(206);
        expect(res.headers["content-range"]).to.match(/^bytes 0-\d+\/\d+$/);
        expect(res.headers["cache-control"]).to.contain("no-store");
        expect(res.headers["content-disposition"]).to.eq("inline");
      });
    });
  });

  it("refuses direct navigation to the video URL", () => {
    cy.login("student");
    cy.enrollInSqa();
    cy.openSeededLesson().then((src) => {
      cy.request({ url: src, headers: { "sec-fetch-dest": "document" }, failOnStatusCode: false })
        .its("status")
        .should("eq", 403);
    });
  });

  it("refuses signed-out requests", () => {
    cy.login("student");
    cy.enrollInSqa();
    cy.openSeededLesson().then((src) => {
      cy.clearAllCookies();
      cy.request({ url: src, headers: AS_MEDIA, failOnStatusCode: false }).its("status").should("eq", 401);
    });
  });

  it("rejects a video link copied from another student", () => {
    cy.login("student");
    cy.enrollInSqa();
    cy.openSeededLesson().then((src) => {
      cy.logoutAll();
      cy.visit("/register");
      cy.get("#name").type("Other Student");
      cy.get("#email").type("other@example.com");
      cy.get("#password").type("Secret123!");
      cy.contains("button", "Create student account").click();
      cy.location("pathname").should("eq", "/student");
      cy.enrollInSqa();

      cy.request({ url: src, headers: AS_MEDIA, failOnStatusCode: false }).its("status").should("eq", 403);
    });
  });

  it("keeps students who are not enrolled out of lessons", () => {
    cy.login("contentAdmin");
    cy.visit("/courses/software-quality-assurance");
    cy.contains("a", "Seeded video lesson")
      .invoke("attr", "href")
      .then((href) => {
        cy.logoutAll();
        cy.login("student");
        cy.visit(String(href));
        cy.location("pathname").should("eq", "/courses/software-quality-assurance");
      });
  });

  it("stops the stream as soon as the student is blocked", () => {
    cy.login("student");
    cy.enrollInSqa();
    cy.openSeededLesson().then((src) => {
      cy.request({ url: src, headers: AS_MEDIA }).its("status").should("be.oneOf", [200, 206]);
      cy.getCookie("lms_session").then((studentSession) => {
        cy.logoutAll();
        cy.login("contentAdmin");
        cy.visit("/admin/users");
        cy.userRow(accounts.student.email).contains("button", "Block").click();
        cy.userRow(accounts.student.email).should("contain", "Blocked");

        cy.logoutAll();
        cy.setCookie("lms_session", studentSession!.value);
        cy.request({ url: src, headers: AS_MEDIA, failOnStatusCode: false }).its("status").should("eq", 401);
      });
    });
  });
});
