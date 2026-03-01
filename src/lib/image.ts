export function resizeImage(file: File, maxWidth = 1200): Promise<{ base64: string; blob: Blob; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("画像の変換に失敗しました"));
              return;
            }

            const reader2 = new FileReader();
            reader2.onload = () => {
              const base64 = (reader2.result as string).split(",")[1];
              resolve({
                base64,
                blob,
                mediaType: "image/jpeg",
              });
            };
            reader2.onerror = reject;
            reader2.readAsDataURL(blob);
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
