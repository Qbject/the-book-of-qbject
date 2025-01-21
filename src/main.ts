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
					"/img/pages/cover-front.jpg",
					"/img/pages/welcome.jpg",
					"/img/pages/about.jpg",
					"/img/pages/who-am-i.jpg",
					"/img/pages/my-story.jpg",
					"/img/pages/skills.jpg",
					"/img/pages/interests.jpg",
					"/img/pages/blank.jpg",
					"/img/pages/journey.jpg",
					"/img/pages/map-1.jpg",
					"/img/pages/map-2.jpg",
					"/img/pages/blank.jpg",
					"/img/pages/career.jpg",
					"/img/pages/thor-systems.jpg",
					"/img/pages/thor-systems-2.jpg",
					"/img/pages/freelance.jpg",
					"/img/pages/freelance-2.jpg",
					"/img/pages/blank.jpg",
					"/img/pages/projects.jpg",
					"/img/pages/qyou.jpg",
					"/img/pages/qyou-2.jpg",
					"/img/pages/iq-tester.jpg",
					"/img/pages/betting-tarot.jpg",
					"/img/pages/autoposter.jpg",
					"/img/pages/autoposter-2.jpg",
					"/img/pages/export-robot.jpg",
					"/img/pages/six-dot-bot.jpg",
					"/img/pages/autoreply.jpg",
					"/img/pages/time-recorder.jpg",
					"/img/pages/fifteen-js.jpg",
					"/img/pages/the-book.jpg",
					"/img/pages/cover-back.jpg",
				],
				spineInner: "/img/pages/spine.jpg",
				spineOuter: "/img/pages/spine.jpg",
				coverEdgeTB: "/img/pages/cover-edge-tb.jpg",
				coverEdgeLR: "/img/pages/cover-edge-lr.jpg",
				spineEdgeTB: "/img/pages/spine-edge-tb.jpg",
				spineEdgeLR: "/img/pages/cover-edge-tb.jpg",
				desk: "/img/desk/desk.jpg",
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
					video: "/video/qyou-demo.mp4",
					top: 364 / pageHeight,
					left: 75 / pageWidth,
					width: 615 / pageWidth,
					height: 416 / pageHeight,
					title: "Watch qYou usage and features",
				},
				{
					faceIndex: 21,
					video: "/video/iq-tester-demo.mp4",
					top: 399 / pageHeight,
					left: 50 / pageWidth,
					width: 664 / pageWidth,
					height: 365 / pageHeight,
					title: "Watch IQ Tester usage and features",
				},
				{
					faceIndex: 22,
					video: "/video/betting-tarot-demo.mp4",
					top: 302 / pageHeight,
					left: 79 / pageWidth,
					width: 606 / pageWidth,
					height: 540 / pageHeight,
					title: "Watch Betting Tarot usage and features",
				},
				{
					faceIndex: 25,
					video: "/video/exportrobot-demo-saving.mp4",
					top: 432 / pageHeight,
					left: 362 / pageWidth,
					width: 351 / pageWidth,
					height: 305 / pageHeight,
					title: "Watch how ExportRobot saves messages",
				},
				{
					faceIndex: 25,
					video: "/video/exportrobot-demo-browser.mp4",
					top: 761 / pageHeight,
					left: 362 / pageWidth,
					width: 351 / pageWidth,
					height: 269 / pageHeight,
					title: "Watch how exported messages look in a browser",
				},
				{
					faceIndex: 26,
					video: "/video/six-dot-bot-demo.mp4",
					top: 402 / pageHeight,
					left: 360 / pageWidth,
					width: 354 / pageWidth,
					height: 628 / pageHeight,
					title: "Watch Six Dot Bot usage and features",
				},
				{
					faceIndex: 27,
					video: "/video/autoreply-demo.mp4",
					top: 410 / pageHeight,
					left: 50 / pageWidth,
					width: 664 / pageWidth,
					height: 354 / pageHeight,
					title: "Watch Autoreply configuration, usage and features",
				},
				{
					faceIndex: 28,
					video: "/video/time-recorder-demo.mp4",
					top: 291 / pageHeight,
					left: 180 / pageWidth,
					width: 404 / pageWidth,
					height: 406 / pageHeight,
					title: "Watch Time Recorder usage and features",
				},
				{
					faceIndex: 29,
					video: "/video/fifteen-js-demo.mp4",
					top: 365 / pageHeight,
					left: 99 / pageWidth,
					width: 567 / pageWidth,
					height: 629 / pageHeight,
					title: "Watch Fifteen.js usage and features",
				},
				{
					faceIndex: 30,
					video: "/video/the-book-demo.mp4",
					top: 442 / pageHeight,
					left: 50 / pageWidth,
					width: 664 / pageWidth,
					height: 373 / pageHeight,
					title: "Watch The Book while watching The Book",
				},
				{
					faceIndex: 5,
					zoom: true,
					top: 187 / pageHeight,
					left: 47 / pageWidth,
					width: 668 / pageWidth,
					height: 668 / pageHeight,
				},
			],
		});
	} else {
		console.error("No container element found");
	}
});
