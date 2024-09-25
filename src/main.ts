import "./style.css";
import Flipbook from "./flipbook";
import InnerPage from "./InnerPage";
import CoverPage from "./CoverPage";

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
			pages: [
				new CoverPage({
					frontUrl: "https://picsum.photos/id/110/445/720",
					backUrl: "https://picsum.photos/id/111/445/720",
					width: 453,
					height: 736,
					thickness: 4,
					rootThickness: 4,
				}),
				new InnerPage({
					frontUrl: "https://picsum.photos/id/120/445/720",
					backUrl: "https://picsum.photos/id/121/445/720",
					flexibility: 1,
					width: 445,
					height: 720,
					thickness: 2,
					rootThickness: 4,
				}),
				new InnerPage({
					frontUrl: "https://picsum.photos/id/122/445/720",
					backUrl: "https://picsum.photos/id/123/445/720",
					flexibility: 1,
					width: 445,
					height: 720,
					thickness: 2,
					rootThickness: 4,
				}),
				new InnerPage({
					frontUrl: "https://picsum.photos/id/124/445/720",
					backUrl: "https://picsum.photos/id/125/445/720",
					flexibility: 1,
					width: 445,
					height: 720,
					thickness: 2,
					rootThickness: 4,
				}),
				new InnerPage({
					frontUrl: "https://picsum.photos/id/126/445/720",
					backUrl: "https://picsum.photos/id/127/445/720",
					flexibility: 1,
					width: 445,
					height: 720,
					thickness: 2,
					rootThickness: 4,
				}),
				new InnerPage({
					frontUrl: "https://picsum.photos/id/128/445/720",
					backUrl: "https://picsum.photos/id/129/445/720",
					flexibility: 1,
					width: 445,
					height: 720,
					thickness: 2,
					rootThickness: 4,
				}),
				new InnerPage({
					frontUrl: "https://picsum.photos/id/130/445/720",
					backUrl: "https://picsum.photos/id/131/445/720",
					flexibility: 1,
					width: 445,
					height: 720,
					thickness: 2,
					rootThickness: 4,
				}),
				new InnerPage({
					frontUrl: "https://picsum.photos/id/132/445/720",
					backUrl: "https://picsum.photos/id/133/445/720",
					flexibility: 1,
					width: 445,
					height: 720,
					thickness: 2,
					rootThickness: 4,
				}),
				new InnerPage({
					frontUrl: "https://picsum.photos/id/134/445/720",
					backUrl: "https://picsum.photos/id/135/445/720",
					flexibility: 1,
					width: 445,
					height: 720,
					thickness: 5,
					rootThickness: 4,
				}),
				new CoverPage({
					frontUrl: "https://picsum.photos/id/136/445/720",
					backUrl: "https://picsum.photos/id/139/445/720",
					width: 453,
					height: 736,
					thickness: 4,
					rootThickness: 4,
				}),
			],
			spineHeight: 736,
			spineThickness: 4,
		});
	} else {
		console.error("No container element found");
	}
});
