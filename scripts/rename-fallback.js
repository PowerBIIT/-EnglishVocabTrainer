const fs = require('fs');

const originalRename = fs.promises.rename.bind(fs.promises);

fs.promises.rename = async (from, to) => {
  try {
    await originalRename(from, to);
  } catch (error) {
    if (error && error.code === 'EXDEV') {
      await fs.promises.copyFile(from, to);
      await fs.promises.unlink(from);
      return;
    }
    throw error;
  }
};
