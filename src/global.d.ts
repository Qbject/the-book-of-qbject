type PageParams = {
    frontUrl: string;
    backUrl: string;
    width: number;
    height: number;
	flexibility?: number;
    thickness?: number;
    rootThickness?: number;
};

type PageControlPointParams = {
    turnProgress: number;
    distance: number;
}

type PageControlPoint = {
    x: number;
    z: number;
}