import joplin from "api";
import { settings } from "./settings";
import { hotfolder } from "./hotfolder";

joplin.plugins.register({
  onStart: async function () {
    console.info("Hotfolder plugin started!");
    await hotfolder.confLocale();

    joplin.settings.onChange(async (event: any) => {
      console.log("Settings changed");
      await hotfolder.register();
    });

    await settings.register();
    await hotfolder.register();
  },
});
