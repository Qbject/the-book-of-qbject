import "./style.css";
import Flipbook from "./flipbook";

declare global {
	interface Window {
		flipbook: Flipbook;
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const containerEl = document.getElementById("flipbook-container");

	if (containerEl) {
		window.flipbook = new Flipbook({
			containerEl,
			textureUrls: {
				pages: [
					"/img/pages/cover-front.png",
					"/img/pages/welcome.png",
					"/img/pages/about.png",
					"/img/pages/who-am-i.png",
					"/img/pages/my-story.png",
					"/img/pages/skills.png",
					"/img/pages/interests.png",
					"/img/pages/blank.png",
					"/img/pages/journey.png",
					"/img/pages/map-1.png",
					"/img/pages/map-2.png",
					"/img/pages/blank.png",
					"/img/pages/career.png",
					"/img/pages/thor-systems.png",
					"/img/pages/thor-systems-2.png",
					"/img/pages/freelance.png",
					"/img/pages/freelance-2.png",
					"/img/pages/blank.png",
					"/img/pages/projects.png",
					"/img/pages/qyou.png",
					"/img/pages/qyou-2.png",
					"/img/pages/iq-tester.png",
					"/img/pages/betting-tarot.png",
					"/img/pages/autoposter.png",
					"/img/pages/autoposter-2.png",
					"/img/pages/export-robot.png",
					"/img/pages/six-dot-bot.png",
					"/img/pages/autoreply.png",
					"/img/pages/time-recorder.png",
					"/img/pages/fifteen-js.png",
					"/img/pages/the-book.png",
					"/img/pages/blank.png",
					"/img/pages/blank-end.png",
					"/img/pages/cover-back.png",
				],
				spineInner: "https://picsum.photos/id/140/445/720", // TODO:
				spineOuter: "https://picsum.photos/id/140/445/720", // TODO:
				coverEdgeTB: "/img/pages/cover-edge-tb.png",
				coverEdgeLR: "/img/pages/cover-edge-lr.png",
				spineEdgeTB: "/img/pages/cover-edge-tb.png", // TODO:
				spineEdgeLR: "/img/pages/cover-edge-tb.png",
				desk: "/img/desk/5-resized.jpg",
			},
			pageEdgeColor: 0xdbc9a2,
			pageWidth: 764,
			pageHeight: 1080,
			coverThickness: 5,
			pageRootThickness: 5,
			pageThickness: 1,
			coverMarginX: 8,
			coverMarginY: 10,
		});
	} else {
		console.error("No container element found");
	}
});
