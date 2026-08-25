// =====================================================
// SUPABASE CONFIGURATION
// =====================================================

// REPLACE THESE TWO VALUES

const SUPABASE_URL = "https://opdbtcrxbbdanameynyr.supabase.co/rest/v1/";

const SUPABASE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// =====================================================
// GLOBAL VARIABLES
// =====================================================

let editingBlogId = null;


// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        loadBlogs();

        loadSingleBlog();

        checkAdminSession();

    }
);


// =====================================================
// LOAD PUBLIC BLOGS
// =====================================================

async function loadBlogs() {

    const blogList =
        document.getElementById("blogList");

    if (!blogList) return;


    const {
        data,
        error
    } = await supabaseClient
        .from("blogs")
        .select("*")
        .eq("published", true)
        .order("created_at", {
            ascending: false
        });


    if (error) {

        blogList.innerHTML =
            "<p>Unable to load blogs.</p>";

        console.error(error);

        return;
    }


    if (!data || data.length === 0) {

        blogList.innerHTML =
            "<p>No blogs published yet.</p>";

        return;
    }


    blogList.innerHTML =
        data.map(blog => `

            <article class="blog-card">

                ${
                    blog.image_url
                    ?
                    `<img
                        src="${escapeHtml(blog.image_url)}"
                        alt="${escapeHtml(blog.title)}"
                    >`
                    :
                    ""
                }

                <div class="blog-card-content">

                    <h2>
                        ${escapeHtml(blog.title)}
                    </h2>

                    <p>
                        ${escapeHtml(blog.excerpt || "")}
                    </p>

                    <a
                        class="read-more"
                        href="blog.html?slug=${encodeURIComponent(blog.slug)}"
                    >
                        Read More →
                    </a>

                </div>

            </article>

        `).join("");

}


// =====================================================
// LOAD SINGLE BLOG
// =====================================================

async function loadSingleBlog() {

    const container =
        document.getElementById("singleBlog");

    if (!container) return;


    const params =
        new URLSearchParams(
            window.location.search
        );


    const slug =
        params.get("slug");


    if (!slug) {

        container.innerHTML =
            "<h1>Blog not found.</h1>";

        return;
    }


    const {
        data,
        error
    } = await supabaseClient
        .from("blogs")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .single();


    if (error || !data) {

        container.innerHTML =
            "<h1>Blog not found.</h1>";

        return;
    }


    document.title =
        data.title + " | Sumanvi";


    container.innerHTML = `

        <h1>
            ${escapeHtml(data.title)}
        </h1>

        ${
            data.image_url
            ?
            `<img
                src="${escapeHtml(data.image_url)}"
                alt="${escapeHtml(data.title)}"
            >`
            :
            ""
        }

        <div class="blog-content">
            ${escapeHtml(data.content)}
        </div>

    `;

}


// =====================================================
// ADMIN LOGIN
// =====================================================

const loginForm =
    document.getElementById("loginForm");


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const email =
                document.getElementById("email").value;

            const password =
                document.getElementById("password").value;


            const message =
                document.getElementById("loginMessage");


            message.textContent =
                "Logging in...";


            const {
                error
            } = await supabaseClient.auth
                .signInWithPassword({

                    email: email,

                    password: password

                });


            if (error) {

                message.textContent =
                    error.message;

                return;
            }


            message.textContent =
                "Login successful.";


            showDashboard();

        }
    );

}


// =====================================================
// CHECK ADMIN SESSION
// =====================================================

async function checkAdminSession() {

    const {
        data
    } = await supabaseClient.auth.getSession();


    if (data.session) {

        showDashboard();

    }

}


// =====================================================
// SHOW DASHBOARD
// =====================================================

function showDashboard() {

    const loginBox =
        document.querySelector(".admin-box");

    const dashboard =
        document.getElementById("dashboard");


    if (loginBox) {

        loginBox.style.display =
            "none";

    }


    if (dashboard) {

        dashboard.style.display =
            "block";

        loadAdminBlogs();

    }

}


// =====================================================
// LOGOUT
// =====================================================

const logoutBtn =
    document.getElementById("logoutBtn");


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async function () {

            await supabaseClient.auth.signOut();

            window.location.reload();

        }
    );

}


// =====================================================
// SAVE BLOG
// =====================================================

const saveBlogBtn =
    document.getElementById("saveBlogBtn");


if (saveBlogBtn) {

    saveBlogBtn.addEventListener(
        "click",
        saveBlog
    );

}


async function saveBlog() {

    const title =
        document.getElementById("blogTitle").value.trim();


    const slug =
        document.getElementById("blogSlug").value.trim();


    const excerpt =
        document.getElementById("blogExcerpt").value.trim();


    const content =
        document.getElementById("blogContent").value.trim();


    const published =
        document.getElementById("blogPublished").checked;


    const imageInput =
        document.getElementById("blogImage");


    const message =
        document.getElementById("adminMessage");


    if (!title || !slug || !content) {

        message.textContent =
            "Title, slug and content are required.";

        return;
    }


    message.textContent =
        "Saving...";


    let imageUrl = null;


    // -------------------------------------------------
    // IF EDITING
    // -------------------------------------------------

    if (editingBlogId) {

        const {
            data: existingBlog
        } = await supabaseClient
            .from("blogs")
            .select("image_url")
            .eq("id", editingBlogId)
            .single();


        imageUrl =
            existingBlog?.image_url || null;

    }


    // -------------------------------------------------
    // UPLOAD IMAGE
    // -------------------------------------------------

    if (
        imageInput.files &&
        imageInput.files.length > 0
    ) {

        const file =
            imageInput.files[0];


        const fileName =
            Date.now() +
            "-" +
            file.name
                .replace(/\s+/g, "-");


        const filePath =
            fileName;


        const {
            error: uploadError
        } = await supabaseClient
            .storage
            .from("blog-images")
            .upload(
                filePath,
                file,
                {
                    cacheControl: "3600",
                    upsert: false
                }
            );


        if (uploadError) {

            message.textContent =
                "Image upload failed: " +
                uploadError.message;

            return;
        }


        const {
            data: publicUrlData
        } =
            supabaseClient
                .storage
                .from("blog-images")
                .getPublicUrl(filePath);


        imageUrl =
            publicUrlData.publicUrl;

    }


    // -------------------------------------------------
    // UPDATE
    // -------------------------------------------------

    if (editingBlogId) {

        const {
            error
        } = await supabaseClient
            .from("blogs")
            .update({

                title: title,

                slug: slug,

                excerpt: excerpt,

                content: content,

                image_url: imageUrl,

                published: published

            })
            .eq("id", editingBlogId);


        if (error) {

            message.textContent =
                error.message;

            return;
        }


        message.textContent =
            "Blog updated successfully.";

    }


    // -------------------------------------------------
    // INSERT
    // -------------------------------------------------

    else {

        const {
            error
        } = await supabaseClient
            .from("blogs")
            .insert({

                title: title,

                slug: slug,

                excerpt: excerpt,

                content: content,

                image_url: imageUrl,

                published: published

            });


        if (error) {

            message.textContent =
                error.message;

            return;
        }


        message.textContent =
            "Blog added successfully.";

    }


    resetBlogForm();

    loadAdminBlogs();

    loadBlogs();

}


// =====================================================
// LOAD ADMIN BLOGS
// =====================================================

async function loadAdminBlogs() {

    const container =
        document.getElementById("adminBlogList");


    if (!container) return;


    const {
        data,
        error
    } = await supabaseClient
        .from("blogs")
        .select("*")
        .order("created_at", {
            ascending: false
        });


    if (error) {

        container.innerHTML =
            "<p>Unable to load blogs.</p>";

        return;
    }


    if (!data || data.length === 0) {

        container.innerHTML =
            "<p>No blogs yet.</p>";

        return;
    }


    container.innerHTML =
        data.map(blog => `

            <div class="admin-blog">

                <h3>
                    ${escapeHtml(blog.title)}
                </h3>

                <p>
                    Slug:
                    ${escapeHtml(blog.slug)}
                </p>

                <p class="publish-status">

                    Status:

                    ${
                        blog.published
                        ?
                        "Published"
                        :
                        "Draft"
                    }

                </p>


                <div class="admin-blog-actions">

                    <button
                        class="edit-btn"
                        onclick="editBlog(${blog.id})"
                    >
                        Edit
                    </button>


                    <button
                        class="delete-btn"
                        onclick="deleteBlog(${blog.id})"
                    >
                        Delete
                    </button>

                </div>

            </div>

        `).join("");

}


// =====================================================
// EDIT BLOG
// =====================================================

async function editBlog(id) {

    const {
        data,
        error
    } = await supabaseClient
        .from("blogs")
        .select("*")
        .eq("id", id)
        .single();


    if (error) {

        alert(error.message);

        return;
    }


    editingBlogId =
        id;


    document.getElementById("blogTitle").value =
        data.title;


    document.getElementById("blogSlug").value =
        data.slug;


    document.getElementById("blogExcerpt").value =
        data.excerpt || "";


    document.getElementById("blogContent").value =
        data.content;


    document.getElementById("blogPublished").checked =
        data.published;


    document.getElementById("formTitle").textContent =
        "Edit Blog";


    document.getElementById("saveBlogBtn").textContent =
        "Update Blog";


    document.getElementById("cancelEditBtn").style.display =
        "inline-block";


    window.scrollTo({
        top: document.querySelector(".blog-form").offsetTop,
        behavior: "smooth"
    });

}


// =====================================================
// DELETE BLOG
// =====================================================

async function deleteBlog(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this blog?"
        );


    if (!confirmDelete) return;


    const {
        error
    } = await supabaseClient
        .from("blogs")
        .delete()
        .eq("id", id);


    if (error) {

        alert(error.message);

        return;
    }


    alert("Blog deleted successfully.");


    loadAdminBlogs();

    loadBlogs();

}


// =====================================================
// CANCEL EDIT
// =====================================================

const cancelEditBtn =
    document.getElementById("cancelEditBtn");


if (cancelEditBtn) {

    cancelEditBtn.addEventListener(
        "click",
        resetBlogForm
    );

}


function resetBlogForm() {

    editingBlogId =
        null;


    document.getElementById("blogTitle").value =
        "";


    document.getElementById("blogSlug").value =
        "";


    document.getElementById("blogExcerpt").value =
        "";


    document.getElementById("blogContent").value =
        "";


    document.getElementById("blogImage").value =
        "";


    document.getElementById("blogPublished").checked =
        false;


    document.getElementById("formTitle").textContent =
        "Add New Blog";


    document.getElementById("saveBlogBtn").textContent =
        "Save Blog";


    document.getElementById("cancelEditBtn").style.display =
        "none";

}


// =====================================================
// SECURITY / HTML ESCAPE
// =====================================================

function escapeHtml(value) {

    if (!value) return "";


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
