package com.familycare.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.familycare.exception.CustomExceptions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024; // 10 MB (CLAUDE.md §8)
    private static final Set<String> IMAGE_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
            "image/webp"
    );
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            // Images
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
            "image/webp",
            // Documents
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/rtf",
            // Text
            "text/plain",
            "text/csv",
            "text/rtf"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "gif", "webp",
            "pdf", "doc", "docx", "xls", "xlsx", "rtf",
            "txt", "csv"
    );

    public static class UploadResult {
        public final String secureUrl;
        public final String publicId;
        public final String thumbnailUrl;
        public final long bytes;
        public final String format;
        public final String resourceType;

        public UploadResult(String secureUrl, String publicId, String thumbnailUrl,
                            long bytes, String format, String resourceType) {
            this.secureUrl = secureUrl;
            this.publicId = publicId;
            this.thumbnailUrl = thumbnailUrl;
            this.bytes = bytes;
            this.format = format;
            this.resourceType = resourceType;
        }
    }

    /**
     * Uploads a file to Cloudinary under the given folder as a public asset.
     * Used for avatars, prescription scans, and other non-sensitive uploads.
     */
    public UploadResult upload(MultipartFile file, String folder) {
        return upload(file, folder, false);
    }

    /**
     * Uploads a file to Cloudinary. When {@code privateAccess} is true, the
     * asset is uploaded with {@code type=authenticated}, meaning Cloudinary
     * will reject any URL that doesn't carry a valid signature + expiry.
     * Use this for medical reports and anything else where the URL itself
     * should not be a permission-bypass.
     */
    public UploadResult upload(MultipartFile file, String folder, boolean privateAccess) {
        validate(file);

        // Only true images go through Cloudinary's image pipeline (transforms,
        // thumbnails, fetch_format). Everything else — PDFs, text, docs,
        // spreadsheets — uploads as `raw` so Cloudinary preserves the file
        // bytes and the original extension in the public_id / delivery URL.
        boolean isImage = isImage(file);
        String resourceType = isImage ? "image" : "raw";

        // Cloudinary's `use_filename` + `filename_override` doesn't reliably
        // work when uploading raw bytes — the SDK can end up posting an empty
        // multipart filename, and Cloudinary then mints a random public_id
        // like "file_za5sav" with no extension, which is exactly what users
        // see when downloading. Building the public_id explicitly removes the
        // ambiguity. For RAW uploads we MUST include the extension in the
        // public_id (.pdf, .txt, .docx, ...) so the delivery URL ends in the
        // right extension and browsers serve it with the right content type.
        // For IMAGE uploads Cloudinary tracks `format` separately, so the
        // public_id stays extension-free and the URL gets `.jpg`/`.png`/etc.
        // appended automatically.
        String originalName = file.getOriginalFilename();
        String baseName = baseNameFor(originalName);
        String ext = extensionOf(originalName);
        String publicId = baseName + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        if (!isImage && ext != null) {
            publicId = publicId + "." + ext;
        }

        try {
            Map<String, Object> options = new java.util.HashMap<>();
            options.put("folder", folder);
            options.put("resource_type", resourceType);
            options.put("public_id", publicId);
            options.put("overwrite", false);
            if (privateAccess) {
                // Authenticated assets reject unsigned access — every download
                // URL must carry a fresh signature + expires_at. Caller is
                // responsible for minting those URLs via
                // generateSignedAuthenticatedUrl() at read time.
                options.put("type", "authenticated");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), options);

            String secureUrl = (String) result.get("secure_url");
            String returnedPublicId = (String) result.get("public_id");
            String format = (String) result.getOrDefault("format", "");
            Number bytesNum = (Number) result.getOrDefault("bytes", 0);

            // For private uploads we don't pre-generate a thumbnail URL —
            // it would be unsigned and useless. Caller mints one on demand.
            String thumbnailUrl = (isImage && !privateAccess)
                    ? cloudinary.url()
                        .transformation(new com.cloudinary.Transformation<>()
                                .width(400).height(400).crop("fill").quality("auto").fetchFormat("auto"))
                        .secure(true)
                        .generate(returnedPublicId)
                    : null;

            log.info("Cloudinary upload success: folder={}, publicId={}, bytes={}, private={}",
                    folder, returnedPublicId, bytesNum.longValue(), privateAccess);

            return new UploadResult(secureUrl, returnedPublicId, thumbnailUrl,
                    bytesNum.longValue(), format, resourceType);
        } catch (IOException e) {
            log.error("Cloudinary upload failed", e);
            throw new CustomExceptions.BadRequestException("Failed to upload file: " + e.getMessage());
        }
    }

    /**
     * Deletes a Cloudinary asset by its public ID. Safe to call for already-gone assets.
     */
    public void delete(String publicId, String resourceType) {
        delete(publicId, resourceType, false);
    }

    /**
     * Deletes a Cloudinary asset, specifying whether it was uploaded as
     * authenticated. Authenticated assets need {@code type=authenticated} on
     * the destroy call too — without it Cloudinary returns "not found".
     */
    public void delete(String publicId, String resourceType, boolean privateAccess) {
        if (publicId == null || publicId.isBlank()) return;
        try {
            Map<String, Object> options = new java.util.HashMap<>();
            options.put("resource_type", resourceType == null ? "image" : resourceType);
            options.put("invalidate", true);
            if (privateAccess) {
                options.put("type", "authenticated");
            }
            cloudinary.uploader().destroy(publicId, options);
            log.info("Cloudinary delete success: publicId={}", publicId);
        } catch (IOException e) {
            // Do not block the DB delete on Cloudinary failure — just log and move on.
            log.warn("Cloudinary delete failed for publicId={}: {}", publicId, e.getMessage());
        }
    }

    /**
     * Generates a time-limited signed URL for sharing a private asset.
     * expiresInSeconds is the validity window from now.
     */
    public String generateSignedUrl(String publicId, String resourceType, long expiresInSeconds) {
        long expiresAt = (System.currentTimeMillis() / 1000L) + expiresInSeconds;
        return cloudinary.url()
                .resourceType(resourceType == null ? "image" : resourceType)
                .signed(true)
                .secure(true)
                .type("upload")
                .generate(publicId + "?expires_at=" + expiresAt);
    }

    /**
     * Generates a signed URL for an asset uploaded with {@code type=authenticated}.
     * <p>
     * On Cloudinary's free tier signed URLs do <em>not</em> have a built-in
     * expiry — true time-bound URLs require the paid Auth Token add-on. What
     * we do gain is that the DB no longer stores a publicly-enumerable URL:
     * the signed URL is minted server-side per request, only after the
     * {@link com.familycare.service.ReportService} access check passes. So
     * the leak surface shrinks from "anyone with the URL forever" to "anyone
     * the user has actually shared a fresh URL with."
     */
    public String generateSignedAuthenticatedUrl(String publicId, String resourceType) {
        return cloudinary.url()
                .resourceType(resourceType == null ? "image" : resourceType)
                .type("authenticated")
                .signed(true)
                .secure(true)
                .generate(publicId);
    }

    /**
     * Generates a signed thumbnail URL (400x400 fill) for an authenticated
     * image asset. Returns null for non-image resource types — callers should
     * use {@link #generateSignedAuthenticatedUrl} for the original instead.
     */
    public String generateSignedAuthenticatedThumbnailUrl(String publicId, String resourceType) {
        if (!"image".equalsIgnoreCase(resourceType)) return null;
        return cloudinary.url()
                .resourceType("image")
                .type("authenticated")
                .signed(true)
                .secure(true)
                .transformation(new com.cloudinary.Transformation<>()
                        .width(400).height(400).crop("fill")
                        .quality("auto").fetchFormat("auto"))
                .generate(publicId);
    }

    private boolean isImage(MultipartFile file) {
        String ct = file.getContentType();
        if (ct != null && IMAGE_MIME_TYPES.contains(ct.toLowerCase())) return true;
        String ext = extensionOf(file.getOriginalFilename());
        return ext != null && Set.of("jpg", "jpeg", "png", "gif", "webp").contains(ext);
    }

    private String extensionOf(String filename) {
        if (filename == null) return null;
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) return null;
        return filename.substring(dot + 1).toLowerCase();
    }

    private String baseNameFor(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) return "report";
        String trimmed = originalFilename.trim();
        int slash = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
        if (slash >= 0) trimmed = trimmed.substring(slash + 1);
        int dot = trimmed.lastIndexOf('.');
        String stem = dot > 0 ? trimmed.substring(0, dot) : trimmed;
        // Cloudinary public_ids may contain letters, digits, _, -, and . only.
        String cleaned = stem.replaceAll("[^a-zA-Z0-9_-]", "_");
        if (cleaned.length() > 80) cleaned = cleaned.substring(0, 80);
        return cleaned.isBlank() ? "report" : cleaned;
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomExceptions.BadRequestException("File is required");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new CustomExceptions.BadRequestException("File too large. Max size is 10MB.");
        }
        String contentType = file.getContentType();
        String ext = extensionOf(file.getOriginalFilename());

        boolean mimeOk = contentType != null && ALLOWED_MIME_TYPES.contains(contentType.toLowerCase());
        // Office files often arrive as application/octet-stream depending on the
        // browser/OS. Fall back to the extension allowlist so .docx / .xlsx /
        // .txt uploads still go through.
        boolean extOk = ext != null && ALLOWED_EXTENSIONS.contains(ext);

        if (!mimeOk && !extOk) {
            throw new CustomExceptions.BadRequestException(
                    "Unsupported file type. Allowed: PDF, images (JPG/PNG/GIF/WEBP), "
                            + "documents (DOC/DOCX/XLS/XLSX/RTF), and text (TXT/CSV).");
        }
    }
}
