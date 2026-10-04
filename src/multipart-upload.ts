export function appendImage(
  form: FormData,
  field: string,
  file: Blob,
): void {
  form.append(field, file, 'photo.jpg');
}
