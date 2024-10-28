declare module '@wmfs/pg-diff-sync' {
	export default function getDiff(sourceDbInfo: object, targetDbInfo: object): string[];
}
