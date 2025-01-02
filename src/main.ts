import "./style.css";
import Flipbook from "./flipbook";

declare global {
	interface Window {
		flipbook: Flipbook;
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const containerEl = document.getElementById("flipbook-container");

	const pageWidth = 764;
	const pageHeight = 1080;
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
			pageWidth,
			pageHeight,
			coverThickness: 5,
			pageRootThickness: 5,
			pageThickness: 1,
			coverMarginX: 8,
			coverMarginY: 10,
			pageActiveAreas: [
				{
					faceIndex: 3,
					link: "https://github.com/Qbject",
					top: 211 / pageHeight,
					left: 68 / pageWidth,
					width: 100 / pageWidth,
					height: 100 / pageHeight,
					title: "GitHub",
				},
				{
					faceIndex: 3,
					// simple spam crawler protection
					link: () =>
						atob(
							"=02bj5CbpFWbnBkb1hmdvRmLtlHZhZnOvRHbpFWb"
								.split("")
								.reverse()
								.join(""),
						),
					top: 420 / pageHeight,
					left: 68 / pageWidth,
					width: 100 / pageWidth,
					height: 100 / pageHeight,
					title: "E-Mail",
				},
				{
					faceIndex: 3,
					link: "https://www.upwork.com/freelancers/~01d961991b7e61979f",
					top: 211 / pageHeight,
					left: 591 / pageWidth,
					width: 100 / pageWidth,
					height: 100 / pageHeight,
					title: "Upwork",
				},
				{
					faceIndex: 3,
					link: "https://www.linkedin.com/in/vadym-dovhun",
					top: 420 / pageHeight,
					left: 591 / pageWidth,
					width: 100 / pageWidth,
					height: 100 / pageHeight,
					title: "LinkedIn",
				},
				{
					faceIndex: 13,
					link: "https://thorsystems.ru/",
					top: 152 / pageHeight,
					left: 50 / pageWidth,
					width: 160 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 16,
					link: "https://www.upwork.com/freelancers/~01d961991b7e61979f",
					top: 264 / pageHeight,
					left: 400 / pageWidth,
					width: 190 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 18,
					link: "https://github.com/Qbject",
					top: 820 / pageHeight,
					left: 380 / pageWidth,
					width: 157 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 21,
					link: "https://github.com/Qbject/iq-tester",
					top: 313 / pageHeight,
					left: 131 / pageWidth,
					width: 143 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 21,
					link: "https://www.whatsmyiq.online/",
					top: 313 / pageHeight,
					left: 288 / pageWidth,
					width: 143 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 25,
					link: "https://github.com/Qbject/exportrobot",
					top: 313 / pageHeight,
					left: 131 / pageWidth,
					width: 143 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 26,
					link: "https://github.com/Qbject/six-dot-bot",
					top: 313 / pageHeight,
					left: 131 / pageWidth,
					width: 143 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 26,
					link: "https://t.me/sixdotbot",
					top: 313 / pageHeight,
					left: 288 / pageWidth,
					width: 143 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 27,
					link: "https://github.com/Qbject/autoreply",
					top: 313 / pageHeight,
					left: 131 / pageWidth,
					width: 143 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 29,
					link: "https://github.com/Qbject/the-game-of-fifteen",
					top: 274 / pageHeight,
					left: 131 / pageWidth,
					width: 143 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 29,
					link: "https://qbject.github.io/the-game-of-fifteen/",
					top: 274 / pageHeight,
					left: 288 / pageWidth,
					width: 143 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 30,
					link: "https://github.com/Qbject/the-book-of-qbject",
					top: 351 / pageHeight,
					left: 131 / pageWidth,
					width: 143 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 30,
					link: ".",
					top: 351 / pageHeight,
					left: 288 / pageWidth,
					width: 143 / pageWidth,
					height: 50 / pageHeight,
				},
				{
					faceIndex: 19,
					video: ".",
					top: 364 / pageHeight,
					left: 75 / pageWidth,
					width: 615 / pageWidth,
					height: 416 / pageHeight,
				},
			],
		});
	} else {
		console.error("No container element found");
	}
});
