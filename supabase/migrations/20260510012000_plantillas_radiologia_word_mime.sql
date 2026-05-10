update storage.buckets
set allowed_mime_types = array[
	'image/png',
	'image/jpeg',
	'image/webp',
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
where id = 'plantillas-radiologia';

notify pgrst, 'reload schema';
