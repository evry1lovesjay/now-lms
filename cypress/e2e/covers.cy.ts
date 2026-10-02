const FIXTURE = "tests/fixtures/cover.jpg";

function fillNewCourse(title: string) {
  cy.visit("/admin/courses/new");
  cy.get("#course-title").type(title);
  cy.get("#course-summary").type("Deploy and run apps on the cloud.");
  cy.get("#course-description").type("AWS, containers and infrastructure as code.");
}

describe("Course covers", () => {
  it("shows the built-in illustration for every existing course", () => {
    cy.visit("/");
    cy.get('[data-testid="course-cover"]')
      .should("have.length", 4)
      .then(($imgs) => {
        const srcs = [...$imgs].map((i) => i.getAttribute("src"));
        expect(srcs).to.deep.equal([
          "/course-covers/software-quality-assurance.svg",
          "/course-covers/data-analytics.svg",
          "/course-covers/product-management.svg",
          "/course-covers/product-design.svg",
        ]);
        srcs.forEach((src) => {
          cy.request(String(src)).then((res) => expect(res.body.length).to.be.lessThan(10_000));
        });
      });
    cy.get('[data-testid="course-cover"]').first().should("have.attr", "loading", "lazy");
  });

  it("resizes and compresses an uploaded cover to a small WebP", () => {
    cy.login("contentAdmin");
    fillNewCourse("Cloud Engineering");
    cy.get("#course-cover").selectFile(FIXTURE);
    cy.get('[data-testid="cover-preview"]').should("have.attr", "src").and("match", /^blob:/);
    cy.contains("button", "Create course").click();
    cy.location("pathname").should("match", /^\/admin\/courses\/(?!new$)[^/]+$/);

    cy.visit("/");
    cy.get('[data-testid="course-cover"]')
      .last()
      .invoke("attr", "src")
      .should("match", /^\/api\/course-covers\/[a-z0-9]+\?v=\d+$/)
      .then((src) => {
        cy.request(String(src)).then((res) => {
          expect(res.headers["content-type"]).to.eq("image/webp");
          expect(res.headers["cache-control"]).to.contain("immutable");
          expect(Number(res.headers["content-length"])).to.be.lessThan(150_000);
        });
        cy.window()
          .then(async (win) => {
            const img = new win.Image();
            img.src = String(src);
            await img.decode();
            return [img.naturalWidth, img.naturalHeight];
          })
          .should("deep.equal", [960, 540]);
      });
  });

  it("lets admins replace a cover and go back to the built-in illustration", () => {
    cy.login("superadmin");
    cy.visit("/admin/courses");
    cy.get("main").contains("a", "Data Analytics").click();
    cy.get("#course-cover").selectFile(FIXTURE);
    cy.contains("button", "Save course").click();
    cy.contains("Course saved.");
    cy.visit("/courses/data-analytics");
    cy.get("header img").first().should("have.attr", "src").and("match", /^\/api\/course-covers\//);

    cy.visit("/admin/courses");
    cy.get("main").contains("a", "Data Analytics").click();
    cy.contains("label", "Use the built-in illustration instead").find("input").check();
    cy.contains("button", "Save course").click();
    cy.contains("Course saved.");
    cy.visit("/courses/data-analytics");
    cy.get("header img").first().should("have.attr", "src", "/course-covers/data-analytics.svg");
  });

  it("rejects files that aren't images", () => {
    cy.login("contentAdmin");
    fillNewCourse("Broken Cover");
    cy.get("#course-cover").selectFile({ contents: Cypress.Buffer.from("hello"), fileName: "notes.png", mimeType: "image/png" });
    cy.contains("button", "Create course").click();
    cy.contains("Upload a JPEG, PNG, WebP or GIF image.");
    cy.visit("/");
    cy.contains("a", "Broken Cover").should("not.exist");
  });
});

export {};
