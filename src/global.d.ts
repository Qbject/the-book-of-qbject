type InnerPageParams = {
	frontUrl: string;
	backUrl: string;
	width: number;
	height: number;
	flexibility?: number;
	thickness?: number;
	rootThickness?: number;
};

type CoverPageParams = {
	frontUrl: string;
	backUrl: string;
	width: number;
	height: number;
	thickness?: number;
	rootThickness?: number;
};

type PageControlPointParams = {
	turnProgress: number;
	distance: number;
};

type PageControlPoint = {
	x: number;
	z: number;
};

interface Page {
	pivot: THREE.Group;
	mesh: THREE.Mesh;
	rootThickness: number;
	update: (dt: number) => void;
	setTurnProgress: (number) => void;
}

type FlipBookParams = {
	containerEl: HTMLElement;
	pages: Page[];
	spineHeight: number;
	spineThickness?: number;
};
