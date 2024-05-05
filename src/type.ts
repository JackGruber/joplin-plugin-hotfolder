interface processFile {
  path: string;
  hotfolderNr: number;
  prevStat: any;
}
interface hotfolderSettings {
  notebookId: string;
  extensionsAddAsText: string;
  ignoreFiles: string;
  importTags: string;
  textAsTodo: boolean;
  importNotebook: string;
}

export { processFile, hotfolderSettings };
