interface processFile {
  path: string;
  hotfolderNr: number;
  prevStat: any;
  intervallFileFinished: number;
}
interface hotfolderSettings {
  notebookId: string;
  extensionsAddAsText: string;
  ignoreFiles: string;
  importTags: string;
  textAsTodo: boolean;
  importNotebook: string;
  intervallFileFinished: number;
  usePolling: boolean;
  pollingIntervall: number;
  depth: number;
}

export { processFile, hotfolderSettings };
