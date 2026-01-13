// public/js/contents.js
window.addEventListener("DOMContentLoaded", () => {
  const newPostModal = document.getElementById("new-post-modal");
  const newPostBtn = document.getElementById("new-post-btn");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const submitPostBtn = document.getElementById("submit-post-btn");

  const postTypeSelect = document.getElementById("post-type");
  const postTextInput = document.getElementById("post-text");
  const postImageUrlInput = document.getElementById("post-image-url");
  const postImageFileInput = document.getElementById("post-image-file");
  const branchSelect = document.getElementById("branch-select");
  const postError = document.getElementById("post-error");

  const feedList = document.querySelector(".feed-list");

  // If we’re not on the main page, bail out
  if (!feedList || !newPostModal) {
    return;
  }

  // ---------- helpers ----------

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

    function buildAvatarHtml(className, avatarPath, fallbackInitial) {
    if (avatarPath) {
      const safeUrl = escapeHtml(avatarPath);
      return `<div class="${className}" style="background-image:url('${safeUrl}'); background-size:cover; background-position:center;"></div>`;
    }
    return `<div class="${className}">${fallbackInitial}</div>`;
  }


  function openPostScreen() {
    newPostModal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    if (postTextInput) postTextInput.value = "";
    if (postImageUrlInput) postImageUrlInput.value = "";
    if (postImageFileInput) postImageFileInput.value = "";
    if (postTypeSelect) postTypeSelect.value = "standard";
    if (branchSelect) branchSelect.value = "";
    if (postError) postError.textContent = "";
  }

  function closePostScreen() {
    newPostModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    if (postError) postError.textContent = "";
  }

  //  comments loading 

  async function loadCommentsForCard(li, postId) {
    const commentsList = li.querySelector(".comments-list");
    if (!commentsList || !postId) return;

    commentsList.innerHTML =
      "<li class='comment-placeholder'>Loading comments…</li>";

    try {
      const res = await fetch(`/M01035301/contents/${postId}/comments`);

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("loadCommentsForCard JSON parse error:", parseErr);
        commentsList.innerHTML =
          "<li class='comment-placeholder'>Couldn't load comments.</li>";
        return;
      }

      console.log("comments response (contents.js) for", postId, data);

      commentsList.innerHTML = "";

      let commentsArr = [];

      if (Array.isArray(data)) {
        commentsArr = data;
      } else if (Array.isArray(data.comments)) {
        commentsArr = data.comments;
      }

      if (!res.ok || !commentsArr.length) {
        commentsList.innerHTML =
          "<li class='comment-placeholder'>No comments yet.</li>";
        return;
      }

      commentsArr.forEach((c) => {
        const liComment = document.createElement("li");
        const created = c.createdAt ? new Date(c.createdAt) : new Date();
        const timeLabel = created.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });

        liComment.className = "comment-item";
        liComment.innerHTML = `
          <span class="comment-author">${escapeHtml(
            c.authorUsername || "Student"
          )}</span>
          <span class="comment-text">${escapeHtml(c.text)}</span>
          <span class="comment-time">${timeLabel}</span>
        `;
        commentsList.appendChild(liComment);
      });
    } catch (err) {
      console.error("loadCommentsForCard error:", err);
      commentsList.innerHTML =
        "<li class='comment-placeholder'>Couldn't load comments.</li>";
    }
  }

  //  build one post card 

  function buildPostCard(post) {
    const li = document.createElement("li");
    li.className = "post-card";

    const created = post.createdAt ? new Date(post.createdAt) : new Date();
    const createdLabel = created.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    const type = post.type || "standard";
    const branch = post.branch || "";
    const username = post.username || "Campus Student";

    let imageBlock = "";
    if (post.images && post.images.length > 0) {
      const src = escapeHtml(post.images[0]);
      imageBlock = `
        <div style="margin-top:0.75rem; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.14);">
          <img src="${src}" alt="Post image" loading="lazy"
               style="width:100%; display:block; max-height:320px; object-fit:cover;">
        </div>
      `;
    }

    const postId = post._id || post.id;
    const initial =
      username && username.length ? username[0].toUpperCase() : "U";
    const avatarHtml = buildAvatarHtml(
      "post-avatar",
      post.avatarPath,
      initial
    );

    li.innerHTML = `
      <div class="post-header">
        ${avatarHtml}
        <div>
          <p class="post-username">${escapeHtml(username)}</p>
          <p class="post-meta">
            ${escapeHtml(type)}${
              branch ? " • " + escapeHtml(branch) : ""
            } • ${createdLabel}
          </p>
        </div>
      </div>
      <p class="post-text">${escapeHtml(post.text || "")}</p>
      ${imageBlock}

      <div class="comments-section" data-post-id="${postId || ""}">
        <ul class="comments-list"></ul>
        <form class="comment-form">
          <input
            type="text"
            class="comment-input"
            placeholder="Write a comment..."
          />
          <button type="submit" class="small-btn">Comment</button>
        </form>
      </div>
    `;

    if (postId) {
      loadCommentsForCard(li, postId);
    }

    return li;
  }


  function prependPostToFeed(post) {
    const card = buildPostCard(post);
    if (!card) return;

    if (feedList.firstChild) {
      feedList.insertBefore(card, feedList.firstChild);
    } else {
      feedList.appendChild(card);
    }
  }

  // ---------- main create-post logic ----------

  async function handleCreatePost() {
    if (!postTextInput || !postTypeSelect || !branchSelect) {
      alert("Form fields missing!");
      return;
    }

    const type = postTypeSelect.value;
    const text = postTextInput.value.trim();
    const branch = branchSelect.value.trim();
    const imageUrlFromInput = postImageUrlInput?.value.trim() || "";

    // must have either text or image
    if (
      !text &&
      !imageUrlFromInput &&
      !(postImageFileInput && postImageFileInput.files.length)
    ) {
      alert("Please write something or add an image before posting!");
      return;
    }

    submitPostBtn.disabled = true;
    submitPostBtn.textContent = "Posting…";
    if (postError) postError.textContent = "";

    let finalImageUrl = imageUrlFromInput;

    // file upload support (POST /M01035301/upload-image)
    if (!finalImageUrl && postImageFileInput && postImageFileInput.files.length) {
      try {
        const formData = new FormData();
        formData.append("image", postImageFileInput.files[0]);

        const uploadRes = await fetch("/M01035301/upload-image", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (uploadRes.ok && uploadData.url) {
          finalImageUrl = uploadData.url;
        } else {
          console.error("Image upload failed:", uploadData);
        }
      } catch (err) {
        console.error("Image upload failed:", err);
        // still allow posting without image
      }
    }

    const payload = {
      type,
      text: text || null,
      branch: branch || null,
      images: finalImageUrl ? [finalImageUrl] : [],
    };

    try {
      const res = await fetch("/M01035301/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create post");
      }

      const username = window.currentUser?.username || "You";

      const newPost = {
        _id: data.contentId,
        text,
        type,
        branch,
        images: payload.images,
        createdAt: new Date().toISOString(),
        username,
        avatarEmoji: window.currentUser?.avatarEmoji || "🎓",
      };

      prependPostToFeed(newPost);
      closePostScreen();

      // reset fields
      postTextInput.value = "";
      if (postImageUrlInput) postImageUrlInput.value = "";
      if (postImageFileInput) postImageFileInput.value = "";
      postTypeSelect.value = "standard";
      branchSelect.value = "";
    } catch (err) {
      console.error("Post creation failed:", err);
      if (postError) {
        postError.textContent =
          err.message || "Couldn't post. Check your connection and try again.";
      } else {
        alert(
          err.message ||
            "Couldn't post. Check your connection and try again."
        );
      }
    } finally {
      submitPostBtn.disabled = false;
      submitPostBtn.textContent = "Post";
    }
  }

  // ---------- event listeners for modal ----------

  newPostBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    openPostScreen();
  });

  closeModalBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closePostScreen();
  });

  newPostModal.addEventListener("click", (e) => {
    if (e.target === newPostModal) {
      closePostScreen();
    }
  });

  submitPostBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    handleCreatePost();
  });

  postTextInput?.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleCreatePost();
    }
  });

  postImageUrlInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreatePost();
    }
  });
});
