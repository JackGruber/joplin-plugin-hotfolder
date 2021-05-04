import joplin from "api";

export namespace helper {
  export async function tagNote(noteId: string, tags: string) {
    let addTags = null;
    if (tags.trim() !== "") {
      addTags = tags.split(/\s*,\s*/);
    }

    if (addTags != null) {
      for (let tag of addTags) {
        let tagId = await getTagId(tag);
        if (tagId != null) {
          try {
            await joplin.data.post(["tags", tagId, "notes"], null, {
              id: noteId,
            });
          } catch (e) {
            console.error("note tagging error");
            console.error(e);
          }
        }
      }
    }
  }

  export async function getTagId(tag: string): Promise<string> {
    tag = tag.trim();
    var query = await joplin.data.get(["search"], {
      query: tag,
      type: "tag",
      fields: "id,title",
    });
    if (query.items.length === 0) {
      console.log("Create tag '" + tag + "'");
      const newTag = await joplin.data.post(["tags"], null, {
        title: tag,
      });
      return newTag.id;
    } else if (query.items.length === 1) {
      return query.items[0].id;
    } else {
      console.error("More than one tag match!");
      console.error(query);
      return null;
    }
  }

  // Get NotebookID
  // notebookName = Notebookname / Notebookpath
  // parent_id = parent NotebookId, empty string = Toplevel Notebook, false = search Notebook from Path
  export async function getNotebookId(
    notebookName: string,
    parent_id: any
  ): Promise<string> {
    if (parent_id !== false) {
      let pageNum = 1;
      do {
        var folders = await joplin.data.get(["folders"], {
          fields: "id,title,parent_id",
          limit: 50,
          page: pageNum++,
        });
        for (const folder of folders.items) {
          if (notebookName == folder.title && parent_id == folder.parent_id) {
            return folder.id;
          }
        }
      } while (folders.has_more);
    } else {
      if (notebookName.indexOf("\\") !== -1) {
        const notebookPath = notebookName.split("\\");
        let notebookId = "";
        for (let subNotebook of notebookPath) {
          notebookId = await getNotebookId(subNotebook, notebookId);
        }
        return notebookId;
      } else {
        return getNotebookId(notebookName, "");
      }
    }

    return null;
  }
}