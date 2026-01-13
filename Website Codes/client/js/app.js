
window.addEventListener("DOMContentLoaded", () => {

  const loginScreen = document.getElementById("login-screen");
  const registerScreen = document.getElementById("register-screen");
  const mainApp = document.getElementById("main-app");


  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");

  const regUsername = document.getElementById("reg-username");
  const regEmail = document.getElementById("reg-email");
  const regPassword = document.getElementById("reg-password");
  const regMsg = document.getElementById("reg-msg");

  const loginBtn = document.getElementById("login-btn");
  const newPostBtn = document.getElementById("new-post-btn");
  const newPostModal = document.getElementById("new-post-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const submitPostBtn = document.getElementById("submit-post-btn");
  const branchSelect = document.getElementById("branch-select");

  const logoutBtn = document.getElementById("logout-btn");
  const dmBtn = document.getElementById("dm-btn");
  const dmPanel = document.getElementById("dm-panel");
  const dmCloseBtn = document.getElementById("dm-close-btn");
  const userSearchResults = document.getElementById("user-search-results");
  const searchInput = document.getElementById("search-input");

  const profileBtn = document.getElementById("profile-btn");
  const profileModal = document.getElementById("profile-modal");
  const profileCloseBtn = document.getElementById("profile-close-btn");
  const myPostsList = document.getElementById("my-posts-list");
  const profileUsernameEl = document.getElementById("profile-username");
  const profileUsernameFooterEl = document.getElementById("profile-username-footer");

  const profileStatsEl = document.getElementById("profile-stats");
  const weatherinfo = document.getElementById("weather-info");

  const dmList = document.getElementById("dm-list");
  const dmComposeForm = document.getElementById("dm-compose-form");
  const dmTextInput = document.getElementById("dm-text-input");
  const dmActiveName = document.getElementById("dm-active-name");
  const dmActiveHint = document.getElementById("dm-active-hint");
  const profileAvatarEl = document.getElementById("profile-avatar");
  const profileBioInput = document.getElementById("profile-bio");
  const profileAvatarUrlInput = document.getElementById("profile-avatar-url");
  const profileSaveBtn = document.getElementById("profile-save-btn");
  const profileNewPostBtn = document.getElementById("profile-new-post-btn");
  const followersList = document.getElementById("followers-list");
  const followersEmpty = document.getElementById("followers-empty");

  const notificationsBtn = document.getElementById("notifications-btn");
  const notificationsBadge = document.getElementById("notifications-badge");
  const notificationsBar = document.getElementById("notifications-bar");

  const toastContainer = document.getElementById("toast-container");

  const confirmModal = document.getElementById("confirm-modal");
  const confirmMessageEl = document.getElementById("confirm-message");
  const confirmOkBtn = document.getElementById("confirm-ok-btn");
  const confirmCancelBtn = document.getElementById("confirm-cancel-btn");

  const societyModal = document.getElementById("society-modal");
  const societyNameInput = document.getElementById("society-name-input");
  const societyDescInput = document.getElementById("society-desc-input");
  const societyCloseBtn = document.getElementById("society-close-btn");
  const societyCancelBtn = document.getElementById("society-cancel-btn");
  const societyCreateBtn = document.getElementById("society-create-btn");

  const createSocietyBtn = document.getElementById("create-society-btn");
  const societyList = document.getElementById("society-list");

  const joinedSocietiesList = document.getElementById("my-societies-list");
  const mySocietiesEmpty = document.getElementById("my-societies-empty");

  const myCreatedSocietiesList = document.getElementById("my-created-societies-list");

  const dmThreadsList = document.getElementById("dm-thread-list");
  const profileButtonAvatar = profileBtn?.querySelector(".profile-avatar") || null;
  const societyDetailModal = document.getElementById("society-detail-modal");
  const societyDetailCloseBtn = document.getElementById("society-detail-close-btn");
  const societyDetailTitle = document.getElementById("society-detail-title");
  const societyDetailMeta = document.getElementById("society-detail-meta");
  const societyDetailDescription = document.getElementById("society-detail-description");
  const societyDetailJoinBtn = document.getElementById("society-detail-join-btn");



  const joinedSocieties = new Set();
  let activeDmUserId = null;
  let activeDmIsMutual = false;

  followersList?.addEventListener("click", async (e) => {
    const box = e.target.closest(".user-card-main");
    if (box) {
      openUserProfile(box.dataset.userId);
      return;
    }

    const btn = e.target.closest(".follow-btn");
    if (btn && !btn.disabled) {
      const userID = btn.dataset.userId;

      const res = await fetch(`/M01035301/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIdToFollow: userID }),
      });

      if (res.ok) {
        btn.textContent = "Following";
        btn.disabled = true;
      }
    }
  });


  function buildProfilePostCard(post, isOwner) {
    const li = buildPostCard(post);
    if (!li) return null;

    if (isOwner) {
      const btn = document.createElement("button");
      btn.className = "delete-post-btn";
      btn.textContent = "Delete";
      btn.addEventListener("click", () => {
        openConfirm("Delete this post?", async () => {
          try {
            const res = await fetch(
              `/M01035301/contents/${post._id}`,
              { method: "DELETE" }
            );
            const data = await res.json();
            if (!res.ok || !data.ok) {
              showToast(data.error || "Could not delete post.", "error");
              return;
            }
            li.remove();
            if (notificationsBar) {
              notificationsBar.textContent =
                "You deleted a post from your profile.";
            }
            showToast("Post deleted", "success");
          } catch (err) {
            console.error("delete post error:", err);
            showToast("Server error. Could not delete post.", "error");
          }
        });
      });
      const actionsDiv = li.querySelector(".post-actions");
      actionsDiv.appendChild(btn);
    }
    return li;
  }


  if (newPostModal) {
    newPostModal.addEventListener("click", (e) => {
      if (e.target === newPostModal) {
        newPostModal.classList.add("hidden");
      }
    });
  }


  async function refreshNotifications() {
    try {
      const res = await fetch(`/M01035301/notifications`);
      const data = await res.json();
      if (!res.ok || !data.ok) return;

      if (notificationsBadge) {
        if (data.unreadCount > 0) {
          notificationsBadge.textContent = String(data.unreadCount);
          notificationsBadge.classList.remove("hidden");
        } else {
          notificationsBadge.classList.add("hidden");
        }
      }

      if (notificationsBar && data.notifications.length) {
        const latest = data.notifications[0];
        notificationsBar.textContent =
          latest.type === "follow"
            ? "You have a new follower."
            : latest.type === "like"
              ? "Someone liked your post."
              : latest.type === "comment"
                ? "Someone commented on your post."
                : "You have a new message.";
      }
    } catch (err) {
      console.error("notifications error:", err);
    }
  }

  notificationsBtn?.addEventListener("click", async () => {
    await fetch(`/M01035301/notifications/read`, { method: "POST" });
    if (notificationsBadge) notificationsBadge.classList.add("hidden");
    refreshNotifications();
  });

  let currentUser = null;
  window.currentUser = null;
  const feedList = document.querySelector(".feed-list");

  function updateLoggedInUsername() {
    const username =
      window.currentUser?.username || currentUser?.username;
    if (!username) return;

    if (profileUsernameEl) {
      profileUsernameEl.textContent = `@${username}`;
    }
    if (profileUsernameFooterEl) {
      profileUsernameFooterEl.textContent = `@${username}`;
    }
  }


  function showMainApp() {
    if (loginScreen) loginScreen.style.display = "none";
    if (registerScreen) registerScreen.style.display = "none";
    if (mainApp) mainApp.style.display = "block";
  }

  function showLogin() {
    if (loginScreen) loginScreen.style.display = "flex";
    if (registerScreen) registerScreen.style.display = "none";
    if (mainApp) mainApp.style.display = "none";
  }

  window.showRegisterBox = function () {
    if (loginScreen) loginScreen.style.display = "none";
    if (registerScreen) registerScreen.style.display = "flex";
  };

  window.hideRegisterBox = function () {
    if (registerScreen) registerScreen.style.display = "none";
    if (loginScreen) loginScreen.style.display = "flex";
  };


  function isSchoolEmail(email) {
    const domain = "@school.ac.uk";
    return email.endsWith(domain);
  }


  async function checkLogin() {
    try {
      const res = await fetch(`/M01035301/login`);
      const data = await res.json();

      if (data.loggedIn) {
        currentUser = data.user;
        window.currentUser = data.user;
        updateLoggedInUsername();
        showMainApp();
        loadFeed("following");
        loadWeatherForBranch();
        refreshNotifications();
        loadSocieties();
        loadMySocieties();
      } else {
        showLogin();
      }
    } catch (err) {
      console.error("checkLogin error:", err);
      showLogin();
    }
  }


  loginBtn.addEventListener("click", async () => {
    if (!loginError) return;

    loginError.style.display = "none";
    loginError.textContent = "";

    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    if (!email || !password) {
      loginError.textContent = "Please enter email and password.";
      loginError.style.display = "block";
      return;
    }



    try {
      const res = await fetch(`/M01035301/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        loginError.textContent = data.error || "Invalid email or password.";
        loginError.style.display = "block";
        return;
      }
      currentUser = data.user;
      window.currentUser = data.user;
      showMainApp();
      loadFeed();
      loadWeatherForBranch();
      refreshNotifications();
      loadSocieties();
      loadMySocieties();


    } catch (err) {
      console.error("login error:", err);
      loginError.textContent = "Server error. Please try again.";
      loginError.style.display = "block";
    }
  });

  // ---------- Register page ----------

  window.registerUser = async function () {
    regMsg.textContent = "";

    const username = regUsername.value.trim();
    const email = regEmail.value.trim();
    const password = regPassword.value.trim();

    if (!username || !email || !password) {
      regMsg.textContent = "Please fill in all fields.";
      return;
    }


    try {
      const res = await fetch(`/M01035301/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        regMsg.textContent = data.error || "Registration failed.";
        return;
      }

      currentUser = data.user;
      window.currentUser = data.user;
      showMainApp();
      loadFeed("following");
      loadWeatherForBranch();

    } catch (err) {
      console.error("register error:", err);
      regMsg.textContent = "Server error. Please try again.";
    }
  };


  logoutBtn?.addEventListener("click", async () => {
    try {
      await fetch(`/M01035301/login`, { method: "DELETE" });
    } catch (err) {
      console.error("logout error:", err);
    }
    showLogin();
  });


  newPostBtn?.addEventListener("click", () => {
    newPostModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  });

  closeModalBtn?.addEventListener("click", () => {
    newPostModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  });
  async function loadWeatherForBranch() {
    const weatherInfo = document.getElementById("weather-info");
    if (!weatherInfo) return;

    weatherInfo.textContent = "Loading Dubai, London and Mauritius campus weather...";

    const campuses = ["dubai", "london", "mauritius"];

    try {
      const responses = await Promise.all(
        campuses.map((c) =>
          fetch(`/M01035301/weather?branch=${encodeURIComponent(c)}`)
        )
      );
      const datas = await Promise.all(responses.map((r) => r.json()));

      const parts = datas
        .map((data, idx) => {
          if (!data.ok) return null;
          const name =
            campuses[idx].charAt(0).toUpperCase() + campuses[idx].slice(1);
          return `${name}: ${data.summary}`;
        })
        .filter(Boolean);

      if (!parts.length) {
        weatherInfo.textContent = "Could not load campus weather.";
      } else {
        weatherInfo.textContent = parts.join(" • ");
      }
    } catch (err) {
      console.error("weather error:", err);
      weatherInfo.textContent = "Could not load campus weather.";
    }
  }

  branchSelect?.addEventListener("change", () => {
    console.log("Branch changed to:", branchSelect.value);
    loadWeatherForBranch();
  });

  dmBtn?.addEventListener("click", () => {
    if (!dmPanel) return;
    dmPanel.classList.remove("hidden");

    if (dmList) {
      dmList.innerHTML =
        "<p class='sidebar-subtitle'>No conversation selected.</p>";
    }
    if (dmActiveName) dmActiveName.textContent = "Start a conversation";
    if (dmActiveHint)
      dmActiveHint.textContent =
        "Choose a student on the left to open their direct messages.";

    activeDmUserId = null;
    loadDmThreads();
  });


  dmCloseBtn?.addEventListener("click", () => {
    if (!dmPanel) return;
    dmPanel?.classList.add("hidden");
  }
  );
  dmPanel?.addEventListener("click", (e) => {
    if (e.target === dmPanel) {
      dmPanel.classList.add("hidden");
    }
  });

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .toString()
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


  function buildPostCard(post) {
    if (!feedList) return null;

    const li = document.createElement("li");
    li.className = "post-card";

    const created = post.createdAt ? new Date(post.createdAt) : new Date();
    const createdLabel = created.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    const username = post.username || "Unknown";
    const type = post.type || "standard";
    const branch = post.branch || "";
    const postId = post._id;

    let imageBlock = "";
    if (post.images && post.images.length) {
      const src = escapeHtml(post.images[0]);
      imageBlock = `
      <div style="margin-top:0.5rem; border-radius:12px; overflow:hidden;">
        <img src="${src}" alt="post image"
             style="width:100%; display:block; max-height:260px; object-fit:cover;">
      </div>
    `;
    }

    const initial =
      username && username.length ? username[0].toUpperCase() : "U";
    const avatarHtml = buildAvatarHtml("post-avatar", post.avatarPath, initial);

    li.innerHTML = `
  <div class="post-header">
    ${avatarHtml}
    <div>
      <p class="post-username">${escapeHtml(username)}</p>
      <p class="post-meta">
        ${escapeHtml(type)}${branch ? " • " + escapeHtml(branch) : ""
      } • ${createdLabel}
      </p>
    </div>
  </div>

  <p class="post-text">${escapeHtml(post.text || "")}</p>
  ${imageBlock}

  <div class="post-actions">
    <button class="action-btn like-btn" data-post-id="${postId}">
      <span class="like-icon">♡</span>
      <span class="like-count">2</span>
    </button>

    <button class="action-btn comment-toggle-btn">
      💬 Comment
    </button>
  </div>

  <div class="comments-section" data-post-id="${postId}">
    <form class="comment-form">
      <div class="comment-input-row">
        <input
          type="text"
          class="comment-input"
          placeholder="Write a comment…"
        />
        <button type="submit" class="comment-post-btn">Post</button>
      </div>
    </form>

    <ul class="comments-list">
      <li class="comment-placeholder">No comments yet.</li>
    </ul>
  </div>
`;

    return li;
  }


  async function loadCommentsForPost(cardEl, postId) {
    const commentsSection = cardEl.querySelector(".comments-section");
    const commentsList = cardEl.querySelector(".comments-list");
    if (!commentsSection || !commentsList || !postId) return;

    commentsList.innerHTML =
      "<li class='comment-placeholder'>Loading comments…</li>";

    try {
      const res = await fetch(`/M01035301/contents/${postId}/comments`);

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("Comments JSON parse error:", parseErr);
        commentsList.innerHTML =
          "<li class='comment-placeholder'>Couldn't load comments.</li>";
        return;
      }

      console.log("comments response for", postId, data);

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
      console.error("loadCommentsForPost error:", err);
      commentsList.innerHTML =
        "<li class='comment-placeholder'>Couldn't load comments.</li>";
    }
  }



  async function loadFollowers() {
    if (!followersList) return;

    followersList.innerHTML = "";
    if (followersEmpty) {
      followersEmpty.style.display = "none";
      followersEmpty.textContent = "";
    }

    try {
      const res = await fetch(`/M01035301/followers`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (followersEmpty) {
          followersEmpty.textContent = "Could not load followers.";
          followersEmpty.style.display = "block";
        }
        return;
      }

      const users = data.users || [];
      if (!users.length) {
        if (followersEmpty) {
          followersEmpty.textContent = "You don't have any followers yet.";
          followersEmpty.style.display = "block";
        }
        return;
      }

      if (followersEmpty) followersEmpty.style.display = "none";

      users.forEach((user) => {
        const li = document.createElement("li");
        li.className = "dm-thread";

        const initials =
          user.username?.[0]?.toUpperCase() ||
          user.email?.[0]?.toUpperCase() ||
          "U";

        // NEW: use isFollowingBack to set label and disabled state
        const isFollowingBack = !!user.isFollowingBack;
        const followLabel = isFollowingBack ? "Following" : "Follow back";
        const disabledAttr = isFollowingBack ? "disabled" : "";

        const avatarHtml = buildAvatarHtml(
          "user-avatar",
          user.avatarPath,
          initials
        );

        li.innerHTML = `
  <div class="user-card-main" data-user-id="${user.id}">
    ${avatarHtml}
    <div>
      <p class="user-name">${escapeHtml(user.username)}</p>
      <p class="user-email">${escapeHtml(user.email || "")}</p>
    </div>
  </div>
  <button class="follow-btn" data-user-id="${user.id}" ${disabledAttr}>
    ${followLabel}
  </button>
        `;

        followersList.appendChild(li);
      });


    } catch (err) {
      console.error("loadFollowers error:", err);
      if (followersEmpty) {
        followersEmpty.textContent =
          "Server error while loading followers.";
        followersEmpty.style.display = "block";
      }
    }
  }


  async function loadMyProfile() {
    if (!profileModal || !myPostsList) return;

    try {
      const res = await fetch(`/M01035301/me`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        console.error("profile error:", data);
        return;
      }

      const user = data.user;
      const posts = data.posts || [];

      if (profileUsernameEl) {
        profileUsernameEl.textContent = `@${user.username}`;
      }

      if (profileStatsEl) {
        profileStatsEl.textContent = `${user.followerCount} followers · ${user.followingCount} following`;
      }

      if (profileBioInput) {
        profileBioInput.value = user.bio || "";
        profileBioInput.disabled = false;
      }
      if (profileAvatarUrlInput) {
        profileAvatarUrlInput.value = user.avatarPath || "";
        profileAvatarUrlInput.disabled = false;
      }
      if (profileAvatarEl) {
        if (user.avatarPath) {
          profileAvatarEl.style.backgroundImage = `url(${user.avatarPath})`;
          profileAvatarEl.textContent = "";
        } else {
          profileAvatarEl.style.backgroundImage = "";
          profileAvatarEl.textContent =
            user.username?.[0]?.toUpperCase() || "U";
        }
      }
      if (profileButtonAvatar) {
        if (user.avatarPath) {
          profileButtonAvatar.style.backgroundImage = `url(${user.avatarPath})`;
          profileButtonAvatar.textContent = "";
        } else {
          profileButtonAvatar.style.backgroundImage = "";
          profileButtonAvatar.textContent =
            user.username?.[0]?.toUpperCase() || "U";
        }
      }

      if (window.currentUser) {
        window.currentUser.avatarPath = user.avatarPath || null;
      }


      if (profileSaveBtn) profileSaveBtn.style.display = "inline-flex";

      if (profileUsernameEl) {
        profileUsernameEl.textContent = `@${user.username}`;
      }
      if (profileUsernameFooterEl) {
        profileUsernameFooterEl.textContent = `@${user.username}`;
      }


      myPostsList.innerHTML = "";
      posts.forEach((post) => {
        const card = buildProfilePostCard(
          { ...post, username: user.username, avatarPath: user.avatarPath },
          true
        );

        if (card) myPostsList.appendChild(card);
      });

    } catch (err) {
      console.error("loadMyProfile error:", err);
    }
  }

  async function loadDmThreads() {
    if (!dmThreadsList) return;

    dmThreadsList.innerHTML =
      "<p class='sidebar-subtitle'>Loading your followers...</p>";

    try {
      const res = await fetch(`/M01035301/followers`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        dmThreadsList.innerHTML =
          "<p class='sidebar-subtitle'>Could not load followers.</p>";
        return;
      }

      const users = data.users || [];
      if (!users.length) {
        dmThreadsList.innerHTML =
          "<p class='sidebar-subtitle'>You don't have any followers yet.</p>";
        return;
      }

      dmThreadsList.innerHTML = "";
      users.forEach((u) => {
        const row = document.createElement("div");
        row.className = "dm-thread";
        row.dataset.userId = u.id;

        const initial =
          u.username && u.username.length
            ? u.username[0].toUpperCase()
            : u.email && u.email.length
              ? u.email[0].toUpperCase()
              : "?";

        const statusLabel = u.isFollowingBack
          ? "Send a Message – "
          : "Follower only – follow back to chat";

        row.innerHTML = `
        <div class="dm-thread-avatar">${initial}</div>
        <div class="dm-thread-main">
          <p class="user-name">${escapeHtml(u.username)}</p>
          <p class="user-email">${escapeHtml(u.email || "")}</p>
          <p class="dm-preview ${u.isFollowingBack ? "dm-status-mutual" : "dm-status-oneway"
          }">
            ${statusLabel}
          </p>
        </div>
      `;

        row.addEventListener("click", () => {
          activeDmUserId = u.id;
          activeDmIsMutual = !!u.isFollowingBack;

          document
            .querySelectorAll(".dm-thread")
            .forEach((el) => el.classList.remove("active"));
          row.classList.add("active");

          if (dmActiveName) dmActiveName.textContent = u.username;
          if (dmActiveHint) {
            dmActiveHint.textContent = u.isFollowingBack
              ? "Direct messages are only visible to you two."
              : "Follow this student back from their profile to unlock messaging.";
          }

          loadMessagesFor(u.id);
        });

        dmThreadsList.appendChild(row);
      });
    } catch (err) {
      console.error("followers load error:", err);
      dmThreadsList.innerHTML =
        "<p class='sidebar-subtitle'>Could not load followers.</p>";
    }
  }


  async function loadMessagesFor(userId) {
    if (!dmList || !userId) return;

    dmList.innerHTML =
      "<p class='sidebar-subtitle'>Loading conversation…</p>";

    try {
      const res = await fetch(
        `/M01035301/messages?userId=${encodeURIComponent(userId)}`
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        dmList.innerHTML =
          "<p class='sidebar-subtitle'>Could not load messages.</p>";
        return;
      }

      const messages = data.messages || [];
      if (!messages.length) {
        dmList.innerHTML =
          "<p class='sidebar-subtitle'>No messages yet. Start the conversation!</p>";
        return;
      }

      dmList.innerHTML = "";
      messages.forEach((msg) => {
        const div = document.createElement("div");
        const mine = currentUser && msg.fromId === currentUser.id;
        div.className = `dm-message ${mine ? "dm-message-out" : "dm-message-in"
          }`;

        const created = msg.createdAt ? new Date(msg.createdAt) : new Date();
        const timeLabel = created.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });

        div.innerHTML = `
          <p class="dm-text">${escapeHtml(msg.text)}</p>
          <span class="dm-time">${timeLabel}</span>
        `;
        dmList.appendChild(div);
      });

      dmList.scrollTop = dmList.scrollHeight;
    } catch (err) {
      console.error("load messages error:", err);
      dmList.innerHTML =
        "<p class='sidebar-subtitle'>Could not load messages.</p>";
    }
  }

  dmComposeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeDmUserId) {
      alert("Choose who you want to message from the left.");
      return;
    }
    if (!activeDmIsMutual) {
      alert(
        "You can only message followers you follow back. Open their profile and tap 'Follow back' first."
      );
      return;
    }

    const text = dmTextInput?.value.trim();
    if (!text) return;

    try {
      const res = await fetch(`/M01035301/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: activeDmUserId, text }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Could not send message.");
        return;
      }

      dmTextInput.value = "";
      loadMessagesFor(activeDmUserId);
    } catch (err) {
      console.error("send message error:", err);
    }
  });

  function openSocietyDetailFromCard(mainEl) {
    if (!societyDetailModal || !mainEl) return;

    const id = mainEl.dataset.societyId;
    const name = mainEl.dataset.societyName || "Society";
    const desc = mainEl.dataset.societyDesc || "No description provided yet.";
    const branch = mainEl.dataset.societyBranch || "All campuses";
    const owner = mainEl.dataset.societyOwner || "Unknown";
    const memberCount = Number(mainEl.dataset.societyMembers || 0);
    const isMember = mainEl.dataset.societyIsmember === "true";

    if (societyDetailTitle) {
      societyDetailTitle.textContent = name;
    }
    if (societyDetailDescription) {
      societyDetailDescription.textContent = desc;
    }
    if (societyDetailMeta) {
      const membersLabel =
        memberCount === 1 ? "1 member" : `${memberCount} members`;
      societyDetailMeta.textContent =
        `${branch} • Owner: ${owner} • ${membersLabel}`;
    }

    if (societyDetailJoinBtn) {
      societyDetailJoinBtn.dataset.societyId = id;
      societyDetailJoinBtn.textContent = isMember ? "Leave society" : "Join society";
      societyDetailJoinBtn.dataset.isMember = isMember ? "true" : "false";
    }

    societyDetailModal.classList.remove("hidden");
  }

  function closeSocietyDetailModal() {
    if (!societyDetailModal) return;
    societyDetailModal.classList.add("hidden");
  }

  societyDetailCloseBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeSocietyDetailModal();
  });

  societyDetailModal?.addEventListener("click", (e) => {
    if (e.target === societyDetailModal) {
      closeSocietyDetailModal();
    }
  });

  // Join or leave from inside the detail screen
  societyDetailJoinBtn?.addEventListener("click", async () => {
    if (!societyDetailJoinBtn) return;

    const id = societyDetailJoinBtn.dataset.societyId;
    if (!id) return;

    const isMember = societyDetailJoinBtn.dataset.isMember === "true";
    const method = isMember ? "DELETE" : "POST";

    try {
      const res = await fetch(
        `/M01035301/societies/${encodeURIComponent(id)}/join`,
        { method }
      );

      const data = await res.json();

      if (!res.ok || !data.ok) {
        showToast(
          data.error || "Could not update society membership.",
          "error"
        );
        return;
      }

      const nowMember = !isMember;
      societyDetailJoinBtn.dataset.isMember = nowMember ? "true" : "false";
      societyDetailJoinBtn.textContent = nowMember
        ? "Leave society"
        : "Join society";

      //  lists in sync
      loadSocieties?.();
      loadMySocieties?.();

      showToast(
        nowMember
          ? `You joined ${societyDetailTitle?.textContent || "this society"}.`
          : `You left ${societyDetailTitle?.textContent || "this society"}.`,
        "success"
      );
    } catch (err) {
      console.error("society detail join/leave error:", err);
      showToast("Server error while updating membership.", "error");
    }
  });




  function openProfileModal() {
    loadMyProfile();
    loadFollowers();
    profileModal?.classList.remove("hidden");
  }

  function closeProfileModal() {
    profileModal?.classList.add("hidden");
  }

  profileBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    openProfileModal();
  });

  profileCloseBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeProfileModal();
  });

  profileModal?.addEventListener("click", (e) => {
    if (e.target === profileModal) closeProfileModal();
  });

  async function loadSocieties() {
    if (!societyList) return;

    try {
      const branch = branchSelect?.value || "";
      const res = await fetch(
        `/M01035301/societies?branch=${encodeURIComponent(branch)}`
      );
      const data = await res.json();

      if (!res.ok || !data.ok) {
        console.error("societies load error:", data);
        return;
      }

      societyList.innerHTML = "";

      if (!data.societies.length) {
        const emptyLi = document.createElement("li");
        emptyLi.className = "society-card";
        emptyLi.innerHTML =
          "<p class=\"sidebar-subtitle\">No societies yet. Create the first one!</p>";
        societyList.appendChild(emptyLi);
        return;
      }

      data.societies.forEach((soc) => {
        const li = document.createElement("li");
        li.className = "society-card";
        li.dataset.societyId = soc.id;

        const memberLabel = `${soc.memberCount || 0} member${(soc.memberCount || 0) === 1 ? "" : "s"
          }`;

        li.innerHTML = `
          <h3>${escapeHtml(soc.name)}</h3>
          <p>${escapeHtml(soc.description || "Student-run society.")}</p>
          <p class="society-meta">
            Owner: ${escapeHtml(soc.ownerUsername || "Unknown")}
            • <span class="society-members-count">${memberLabel}</span>
          </p>
          <button class="small-btn society-join-btn">
            ${soc.isMember ? "Leave" : "Join"}
          </button>
        `;
        societyList.appendChild(li);
      });
    } catch (err) {
      console.error("societies load error:", err);
    }
  }
  async function loadMySocieties() {
    if (!myCreatedSocietiesList) return;

    try {
      const res = await fetch(`/M01035301/my-societies`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        console.error("my-societies load error:", data);
        return;
      }

      myCreatedSocietiesList.innerHTML = "";

      if (!data.societies.length) {
        const p = document.createElement("p");
        p.className = "sidebar-subtitle";
        p.textContent = "You don’t manage any societies yet.";
        myCreatedSocietiesList.appendChild(p);
        return;
      }

      data.societies.forEach((soc) => {
        const li = document.createElement("li");
        li.className = "society-card";

        const members = soc.members || [];
        const memberText = members.length
          ? members.join(", ")
          : "No members yet.";

        li.innerHTML = `
        <h3>${escapeHtml(soc.name)}</h3>
        <p class="society-meta">
          Members (${members.length}): ${escapeHtml(memberText)}
        </p>
      `;
        myCreatedSocietiesList.appendChild(li);
      });
    } catch (err) {
      console.error("my-societies load error:", err);
    }
  }




  function prependPostToFeed(post) {
    if (!feedList) return;
    const card = buildPostCard(post);
    if (!card) return;

    if (feedList.firstChild) {
      feedList.insertBefore(card, feedList.firstChild);
    } else {
      feedList.appendChild(card);
    }
  }

  async function loadFeed() {
    if (!feedList) return;

    try {
      const res = await fetch(`/M01035301/feed`);
      const data = await res.json();


      if (!res.ok || !data.ok) {
        console.error("load feed error:", data);
        return;
      }

      async function loadWeatherForBranch() {
        if (!weatherinfo) return;

        const branch = branchSelect?.value || "main";

        try {
          const res = await fetch(`/M01035301/weather?branch=${encodeURIComponent(branch)}`);
          const data = await res.json();
          if (!res.ok || !data.ok) {
            weatherinfo.textContent = "Weather data unavailable.";
            return;
          }
          weatherinfo.textContent = ("weather error:", err);
        } catch (err) {
          console.error("weather fetch error:", err);
          weatherinfo.textContent = "Weather data unavailable.";
        }
      }

      feedList.innerHTML = "";

      data.posts.forEach((post) => {
        const card = buildPostCard(post);
        if (!card) return;

        feedList.appendChild(card);

        const postId = post._id || post.id;
        if (postId) {
          loadCommentsForPost(card, postId);
        }
      });


    } catch (err) {
      console.error("load feed fetch error:", err);
    }
  }
  feedList?.addEventListener("submit", async (e) => {
    const form = e.target.closest(".comment-form");
    if (!form) return;
    e.preventDefault();

    const section = form.closest(".comments-section");
    const input = form.querySelector(".comment-input");
    if (!section || !input) return;

    const text = input.value.trim();
    if (!text) return;

    const postId = section.getAttribute("data-post-id");
    if (!postId) return;

    try {
      const res = await fetch(`/M01035301/contents/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok || !data.comment) {
        console.error("Comment create error:", data);
        return;
      }

      const commentsList = section.querySelector(".comments-list");
      if (commentsList) {
        commentsList
          .querySelectorAll(".comment-placeholder")
          .forEach((el) => el.remove());

        const c = data.comment;
        const created = c.createdAt ? new Date(c.createdAt) : new Date();
        const timeLabel = created.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const liComment = document.createElement("li");
        liComment.className = "comment-item";
        liComment.innerHTML = `
        <span class="comment-author">${escapeHtml(c.authorUsername || "You")}</span>
        <span class="comment-text">${escapeHtml(c.text)}</span>
        <span class="comment-time">${timeLabel}</span>
      `;
        commentsList.appendChild(liComment);
      }

      input.value = "";
    } catch (err) {
      console.error("comment submit error:", err);
    }
  });


  feedList?.addEventListener("click", async (e) => {
    const likeBtn = e.target.closest(".like-btn");
    if (!likeBtn) return;

    const postId = likeBtn.getAttribute("data-post-id");
    if (!postId) return;

    try {
      const res = await fetch(`/M01035301/contents/${postId}/like`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        console.error("like error:", data);
        return;
      }

      const likesRes = await fetch(`/M01035301/contents/${postId}/likes`);
      const likesData = await likesRes.json();

      if (likesRes.ok && likesData.ok) {
        likeBtn.textContent = `${likesData.liked ? "♥" : "♡"} ${likesData.count} likes`;
      } else {
        likeBtn.textContent = data.liked ? "♥ Liked" : "♡ Like";
      }
    } catch (err) {
      console.error("like click error:", err);
    }
  });


  async function performUserSearch() {

    if (!searchInput || !userSearchResults) return;

    const q = searchInput.value.trim();
    if (!q) {
      userSearchResults.classList.add("hidden");
      userSearchResults.innerHTML = "";
      return;
    }

    userSearchResults.classList.remove("hidden");
    userSearchResults.innerHTML = `<p class="search-loading">Searching…</p>`;

    try {
      const res = await fetch(
        `/M01035301/users?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();

      if (!res.ok || !data.ok || !Array.isArray(data.users)) {
        userSearchResults.innerHTML =
          `<p class="search-error">Could not load search results.</p>`;
        return;
      }

      const users = data.users;
      userSearchResults.innerHTML = "";

      if (users.length === 0) {
        userSearchResults.innerHTML =
          `<p class="search-empty">No users found.</p>`;
        return;
      }

      const title = document.createElement("p");
      title.className = "search-section-title";
      title.textContent = "Users";
      userSearchResults.appendChild(title);

      users.forEach((user) => {
        const card = document.createElement("div");
        card.className = "user-card";

        const initials =
          user.username?.[0]?.toUpperCase() ||
          user.email?.[0]?.toUpperCase() ||
          "U";

        const avatarHtml = buildAvatarHtml(
          "user-avatar",
          user.avatarPath,
          initials
        );

        const isFollowing = !!user.isFollowing;
        const followLabel = isFollowing ? "Following" : "Follow";
        const disabledAttr = isFollowing ? "disabled" : "";

        card.innerHTML = `
        <div class="user-card-main" data-user-id="${user.id || user._id}">
          ${avatarHtml}
          <div>
            <p class="user-name">${escapeHtml(user.username)}</p>
            <p class="user-email">${escapeHtml(user.email || "")}</p>
          </div>
        </div>
<button type="button" class="follow-btn" data-user-id="${user.id || user._id}" ${disabledAttr}>
  ${followLabel}
</button>

      `;

        userSearchResults.appendChild(card);
      });
    } catch (err) {
      console.error("user search error:", err);
      userSearchResults.innerHTML =
        `<p class="search-error">Error during search.</p>`;
    }
  }



  searchInput?.addEventListener("input", (e) => {
    performUserSearch();
  });

  userSearchResults?.addEventListener("click", async (e) => {
    const box = e.target.closest(".user-card-main");
    if (box) {
      const id = box.dataset.userId;
      if (id) {
        openUserProfile(id);
      }
      return;
    }

    const socMain = e.target.closest(".society-search-main");
    if (socMain) {
      openSocietyDetailFromCard(socMain);
      return;
    }

    // Click to follow user
    const btn = e.target.closest(".follow-btn");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();

      const userID = btn.dataset.userId;
      if (!userID) return;

      try {
        const res = await fetch(`/M01035301/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIdToFollow: userID }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.ok === false) {
          console.error("Follow failed:", data);
          showToast(data.error || "Could not follow user.", "error");
          return;
        }

        btn.textContent = "Following";
        btn.disabled = true;

        await loadFeed();

      } catch (err) {
        console.error("follow error:", err);
        showToast("Server error while following.", "error");
      }

      return;
    }
  });


  async function openUserProfile(userId) {
    try {
      const res = await fetch(`/M01035301/user/${userId}`);
      const data = await res.json();

      if (!data.ok) return;

      const user = data.user;
      const isMe = currentUser && user.id === currentUser.id;

      if (profileUsernameEl) {
        profileUsernameEl.textContent = `@${user.username}`;
      }
      if (profileStatsEl) {
        profileStatsEl.textContent = `${user.followerCount} followers · ${user.followingCount} following`;
      }

      if (profileBioInput) {
        profileBioInput.value = user.bio || "";
        profileBioInput.disabled = !isMe;
      }
      if (profileAvatarUrlInput) {
        profileAvatarUrlInput.value = user.avatarPath || "";
        profileAvatarUrlInput.disabled = !isMe;
      }
      if (profileSaveBtn) {
        profileSaveBtn.style.display = isMe ? "inline-flex" : "none";
      }

      if (profileAvatarEl) {
        if (user.avatarPath) {
          profileAvatarEl.style.backgroundImage = `url(${user.avatarPath})`;
          profileAvatarEl.textContent = "";
        } else {
          profileAvatarEl.style.backgroundImage = "";
          profileAvatarEl.textContent =
            user.username?.[0]?.toUpperCase() || "U";
        }
      }
      if (profileButtonAvatar) {
        if (user.avatarPath) {
          profileButtonAvatar.style.backgroundImage = `url(${user.avatarPath})`;
          profileButtonAvatar.textContent = "";
        } else {
          profileButtonAvatar.style.backgroundImage = "";
          profileButtonAvatar.textContent =
            user.username?.[0]?.toUpperCase() || "U";
        }
      }

      if (window.currentUser) {
        window.currentUser.avatarPath = user.avatarPath || null;
      }


      myPostsList.innerHTML = "";
      (data.posts || []).forEach((p) => {
        const card = buildProfilePostCard(
          { ...p, username: user.username, avatarPath: user.avatarPath },
          isMe
        );

        if (card) myPostsList.appendChild(card);
      });

      profileModal.classList.remove("hidden");
    } catch (err) {
      console.error(err);
    }
  }

  societyList?.addEventListener("click", (e) => {
    const btn = e.target.closest(".society-join-btn");
    if (!btn) return;

    const card = btn.closest(".society-card");
    if (!card) return;

    const Id = card.dataset.societyId;
    const name = card.querySelector("h3")?.textContent || "this society";
    const isJoining = btn.textContent.trim().toLowerCase() === "join";
    const actionWord = isJoining ? "join" : "leave";

    openConfirm(`Do you want to ${actionWord} ${name}?`, async () => {
      try {
        const method = isJoining ? "POST" : "DELETE";
        const res = await fetch(
          `/M01035301/societies/${encodeURIComponent(Id)}/join`,
          { method }
        );
        const data = await res.json();

        if (!res.ok || !data.ok) {
          showToast(
            data.error || "Could not update society membership.",
            "error"
          );
          return;
        }

        btn.textContent = isJoining ? "Leave" : "Join";

        const countEl = card.querySelector(".society-members-count");
        if (countEl && typeof data.memberCount === "number") {
          const label = `${data.memberCount} member${data.memberCount === 1 ? "" : "s"
            }`;
          countEl.textContent = label;
        }

        await loadMySocieties();

        showToast(
          isJoining
            ? `You joined ${name}.`
            : `You left ${name}.`,
          "success"
        );
      } catch (err) {
        console.error("join/leave society error:", err);
        showToast("Server error while updating membership.", "error");
      }
    });
  });
  // Show society details (name + description) when clicking the card (not the Join button)
  societyList?.addEventListener("click", (e) => {
    // Ignore clicks that started on the Join/Leave button – that’s handled above
    if (e.target.closest(".society-join-btn")) return;

    const card = e.target.closest(".society-card");
    if (!card) return;

    const name =
      card.querySelector("h3")?.textContent?.trim() || "Society";
    const desc =
      card.querySelector("p")?.textContent?.trim() ||
      "No description provided yet.";

    showToast(`${name}: ${desc}`, "info");
  });


  profileSaveBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!profileBioInput || !profileAvatarUrlInput) return;

    const bio = profileBioInput.value.trim();
    const avatarUrl = profileAvatarUrlInput.value.trim();

    try {
      const res = await fetch(`/M01035301/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Could not save profile.");
        return;
      }
      // Refresh stats/avatar
      loadMyProfile();
    } catch (err) {
      console.error("save profile error:", err);
    }
  });

  profileNewPostBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeProfileModal();
    newPostModal?.classList.remove("hidden");




  });


  function openSocietyModal() {
    if (!societyModal) return;
    societyNameInput.value = "";
    societyDescInput.value = "";
    societyModal.classList.remove("hidden");
  }

  function closeSocietyModal() {
    if (!societyModal) return;
    societyModal.classList.add("hidden");
  }

  societyCloseBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeSocietyModal();
  });

  societyModal?.addEventListener("click", (e) => {
    if (e.target === societyModal) {
      closeSocietyModal();
    }
  });
  societyCancelBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeSocietyModal();
  });


  createSocietyBtn?.addEventListener("click", () => {
    openSocietyModal();
  });

  // Create society 
  societyCreateBtn?.addEventListener("click", async () => {
    if (!societyList || !societyNameInput || !societyDescInput) return;

    const name = societyNameInput.value.trim();
    const desc = societyDescInput.value.trim();
    const branch = branchSelect?.value || "";

    if (!name) {
      showToast("Add a society name to continue.", "error");
      return;
    }

    try {
      const res = await fetch(`/M01035301/societies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc, branch }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok || !data.society) {
        showToast(data.error || "Could not create society.", "error");
        return;
      }

      if (notificationsBar) {
        notificationsBar.textContent = `You created ${name} society.`;
      }

      showToast(`Society “${name}” created`, "success");
      closeSocietyModal();

      await loadSocieties();
      await loadMySocieties();
    } catch (err) {
      console.error("create society error:", err);
      showToast("Server error while creating society.", "error");
    }
  });


  // Click to join or leave societies
  societyList?.addEventListener("click", (e) => {
    const card = e.target.closest(".society-card");
    if (!card) return;

    const titleEl = card.querySelector("h3");
    const name = titleEl ? titleEl.textContent.trim() : "";
    if (!name) return;

    const isJoined = card.classList.contains("joined");

    if (!isJoined) {
      openConfirm(`Do you want to join "${name}"?`, () => {
        card.classList.add("joined");

        if (!card.querySelector(".joined-tag")) {
          const tag = document.createElement("span");
          tag.className = "joined-tag";
          tag.textContent = "Joined";
          card.appendChild(tag);
        }

        addJoinedSociety(name);
        showToast(`You joined ${name}.`, "success");
      });
    } else {
      openConfirm(`Leave "${name}"?`, () => {
        card.classList.remove("joined");
        const tag = card.querySelector(".joined-tag");
        if (tag) tag.remove();

        removeJoinedSociety(name);
        showToast(`You left ${name}.`, "info");
      });
    }
  });


  function refreshMySocietiesEmptyState() {
    if (!joinedSocietiesList || !mySocietiesEmpty) return;
    if (joinedSocietiesList.children.length === 0) {
      mySocietiesEmpty.style.display = "block";
    } else {
      mySocietiesEmpty.style.display = "none";
    }
  }

  function addJoinedSociety(name) {
    if (!joinedSocietiesList || !name) return;
    if (joinedSocieties.has(name)) return;

    joinedSocieties.add(name);

    const li = document.createElement("li");
    li.className = "society-card joined";
    li.innerHTML = `
    <h3>${name}</h3>
    <p class="society-meta">You are a member</p>
    <span class="joined-tag">Joined</span>
  `;
    joinedSocietiesList.appendChild(li);
    refreshMySocietiesEmptyState();
  }

  function removeJoinedSociety(name) {
    if (!joinedSocietiesList || !name) return;
    joinedSocieties.delete(name);

    const items = Array.from(joinedSocietiesList.children);
    items.forEach((li) => {
      const h3 = li.querySelector("h3");
      if (h3 && h3.textContent.trim() === name) {
        li.remove();
      }
    });

    refreshMySocietiesEmptyState();
  }


  refreshMySocietiesEmptyState();


  profileSaveBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!profileBioInput || !profileAvatarUrlInput) return;

    const bio = profileBioInput.value.trim();
    const avatarUrl = profileAvatarUrlInput.value.trim();

    try {
      const res = await fetch(`/M01035301/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Could not save profile.");
        return;
      }
      loadMyProfile();
    } catch (err) {
      console.error("save profile error:", err);
    }
  });

  profileNewPostBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeProfileModal();
    newPostModal?.classList.remove("hidden");
  });


  function showToast(message, type = "info") {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "toast";

    if (type === "success") toast.classList.add("toast-success");
    if (type === "error") toast.classList.add("toast-error");

    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-hide");
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  let confirmHandler = null;

  function openConfirm(message, onConfirm) {
    if (!confirmModal || !confirmMessageEl) {
      if (window.confirm(message)) onConfirm && onConfirm();
      return;
    }
    confirmHandler = onConfirm;
    confirmMessageEl.textContent = message;
    confirmModal.classList.remove("hidden");
  }

  confirmOkBtn?.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
    if (confirmHandler) {
      const fn = confirmHandler;
      confirmHandler = null;
      fn();
    }
  });

  confirmCancelBtn?.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
    confirmHandler = null;
  });

  confirmModal?.addEventListener("click", (e) => {
    if (e.target === confirmModal) {
      confirmModal.classList.add("hidden");
      confirmHandler = null;
    }
  });

});



