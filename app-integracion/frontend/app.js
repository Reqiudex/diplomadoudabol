
const API_URL = "http://127.0.0.1:8000/api/v1";

let tokenJWT = null;

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const productForm = document.getElementById("productForm");
const refreshBtn = document.getElementById("refreshBtn");

function mostrarMensaje(id, mensaje, esError = false) {
    const elemento = document.getElementById(id);
    elemento.textContent = mensaje;
    elemento.className = esError ? "message error" : "message status";
}

async function solicitarAPI(url, opciones = {}) {
    const respuesta = await fetch(url, opciones);

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
        throw new Error(
            datos.detail || `Error HTTP ${respuesta.status}`
        );
    }

    return datos;
}

// 1. Autenticación: obtener token JWT.
async function iniciarSesion() {
    const username = document.getElementById("user").value.trim();
    const password = document.getElementById("pass").value;

    try {
        const datos = await solicitarAPI(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        tokenJWT = datos.access_token;

        mostrarMensaje(
            "msg-login",
            "Sesión iniciada. Token JWT recibido correctamente."
        );

    } catch (error) {
        tokenJWT = null;
        mostrarMensaje("msg-login", error.message, true);
    }
}

// 2. Consultar y mostrar productos.
async function cargarProductos() {
    const lista = document.getElementById("lista-productos");
    lista.replaceChildren();

    const cargando = document.createElement("li");
    cargando.textContent = "Cargando productos...";
    lista.appendChild(cargando);

    try {
        const productos = await solicitarAPI(`${API_URL}/productos`);

        lista.replaceChildren();

        if (productos.length === 0) {
            const vacio = document.createElement("li");
            vacio.textContent = "No hay productos registrados.";
            lista.appendChild(vacio);
            return;
        }

        productos.forEach(producto => {
            const li = document.createElement("li");
            li.className = "product";

            const nombre = document.createElement("strong");
            nombre.textContent = producto.nombre;

            const detalle = document.createElement("p");
            detalle.textContent =
                `ID: ${producto.id} | Precio: ${producto.precio.toFixed(2)} | Stock: ${producto.stock}`;

            li.appendChild(nombre);
            li.appendChild(detalle);
            lista.appendChild(li);
        });

    } catch (error) {
        lista.replaceChildren();

        const li = document.createElement("li");
        li.textContent = `Error al cargar productos: ${error.message}`;
        lista.appendChild(li);
    }
}

// 3. Registrar producto con autenticación Bearer.
async function guardarProducto(evento) {
    evento.preventDefault();

    if (!tokenJWT) {
        mostrarMensaje(
            "msg-producto",
            "Primero debes iniciar sesión.",
            true
        );
        return;
    }

    const nombre = document.getElementById("prod-nombre").value.trim();
    const precio = Number(document.getElementById("prod-precio").value);
    const stockTexto = document.getElementById("prod-stock").value;
    const stock = Number(stockTexto);

    if (
        !nombre ||
        !Number.isFinite(precio) ||
        precio < 0 ||
        stockTexto === "" ||
        !Number.isInteger(stock) ||
        stock < 0
    ) {
        mostrarMensaje(
            "msg-producto",
            "Revisa el nombre, precio y stock.",
            true
        );
        return;
    }

    try {
        const producto = await solicitarAPI(`${API_URL}/productos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${tokenJWT}`
            },
            body: JSON.stringify({ nombre, precio, stock })
        });

        mostrarMensaje(
            "msg-producto",
            `Producto "${producto.nombre}" registrado correctamente.`
        );

        productForm.reset();
        await cargarProductos();

    } catch (error) {
        mostrarMensaje("msg-producto", error.message, true);
    }
}

// 4. Cerrar sesión en la interfaz.
function cerrarSesion() {
    tokenJWT = null;

    mostrarMensaje("msg-login", "Sesión cerrada.");
    mostrarMensaje("msg-producto", "");

    document.getElementById("pass").value = "";
}

// Asociar eventos.
loginBtn.addEventListener("click", iniciarSesion);
logoutBtn.addEventListener("click", cerrarSesion);
productForm.addEventListener("submit", guardarProducto);
refreshBtn.addEventListener("click", cargarProductos);

// Carga inicial del inventario.
cargarProductos();
