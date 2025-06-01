// Configuración de la base de datos IndexedDB
const dbName = 'EnvioDineroDB';
const dbVersion = 1;

// Valores por defecto de configuración
const configPorDefecto = {
    nombreEmpresa: 'ECUA-SENDER',
    telefonoEmpresa: '+240 555 123456',
    logoEmpresa: null // Base64 del logo por defecto
};

// Lista de ciudades de Guinea Ecuatorial
const ciudadesGE = [
    'Malabo',
    'Bata',
    'Ebebiyín',
    'Aconibe',
    'Mongomo',
    'Evinayong',
    'Luba',
    'Mbini',
    'Cogo',
    'Nsork',
    'Niefang',
    'Micomeseng'
];

// Inicializar la base de datos
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Crear almacén de usuarios
            if (!db.objectStoreNames.contains('usuarios')) {
                db.createObjectStore('usuarios', { keyPath: 'email' });
            }
            
            // Crear almacén de ciudades
            if (!db.objectStoreNames.contains('ciudades')) {
                const ciudadesStore = db.createObjectStore('ciudades', { keyPath: 'id' });
                ciudadesGE.forEach((ciudad, index) => {
                    ciudadesStore.add({ id: index + 1, nombre: ciudad });
                });
            }
            
            // Crear almacén de facturas
            if (!db.objectStoreNames.contains('facturas')) {
                db.createObjectStore('facturas', { keyPath: 'numeroTransaccion' });
            }
            
            // Crear almacén de configuración
            if (!db.objectStoreNames.contains('configuracion')) {
                const configStore = db.createObjectStore('configuracion', { keyPath: 'id' });
                configStore.add({ id: 1, ...configPorDefecto });
            }
        };
    });
}

// Guardar configuración en la base de datos
async function guardarConfiguracion(config) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['configuracion'], 'readwrite');
        const store = transaction.objectStore('configuracion');
        const request = store.put({ id: 1, ...config });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Obtener configuración
async function obtenerConfiguracion() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['configuracion'], 'readonly');
        const store = transaction.objectStore('configuracion');
        const request = store.get(1);
        
        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result);
            } else {
                resolve(configPorDefecto);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// Funciones de autenticación
async function registrarUsuario(usuario) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['usuarios'], 'readwrite');
        const store = transaction.objectStore('usuarios');
        
        // Añadir el estado de bloqueado como falso por defecto
        usuario.bloqueado = false;
        
        const request = store.add(usuario);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function eliminarUsuario(email) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['usuarios'], 'readwrite');
        const store = transaction.objectStore('usuarios');
        const request = store.delete(email);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function cambiarEstadoBloqueo(email, estado) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['usuarios'], 'readwrite');
        const store = transaction.objectStore('usuarios');
        const getRequest = store.get(email);
        
        getRequest.onsuccess = () => {
            const usuario = getRequest.result;
            if (usuario) {
                usuario.bloqueado = estado;
                const updateRequest = store.put(usuario);
                
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
            } else {
                reject('Usuario no encontrado');
            }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
    });
}

async function validarLogin(email, password) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['usuarios'], 'readonly');
        const store = transaction.objectStore('usuarios');
        const request = store.get(email);
        
        request.onsuccess = () => {
            const usuario = request.result;
            if (usuario && usuario.password === password) {
                // Verificar si el usuario está bloqueado
                if (usuario.bloqueado) {
                    reject('Su cuenta ha sido bloqueada. Contacte al administrador.');
                } else {
                    resolve(usuario);
                }
            } else {
                reject('Credenciales inválidas');
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// Modificar la función mostrarUsuarios
async function mostrarUsuarios() {
    const db = await initDB();
    const transaction = db.transaction(['usuarios'], 'readonly');
    const store = transaction.objectStore('usuarios');
    const request = store.getAll();
    
    request.onsuccess = () => {
        const usuarios = request.result;
        const lista = document.getElementById('lista-usuarios');
        lista.innerHTML = '';
        
        if (usuarios.length === 0) {
            lista.innerHTML = '<li class="list-group-item text-center">No hay usuarios registrados</li>';
            return;
        }
        
        usuarios.forEach(usuario => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            if (usuario.bloqueado) {
                li.classList.add('usuario-bloqueado');
            }
            
            const userInfo = document.createElement('div');
            userInfo.innerHTML = `
                <strong>${usuario.nombre}</strong>
                <br>
                <small>${usuario.email}</small>
            `;
            
            const botonesAccion = document.createElement('div');
            botonesAccion.className = 'lista-usuarios-acciones';
            
            const btnBloquear = document.createElement('button');
            btnBloquear.className = usuario.bloqueado ? 
                'btn btn-sm btn-success me-2' : 'btn btn-sm btn-warning me-2';
            btnBloquear.innerHTML = usuario.bloqueado ? 
                '<i class="bi bi-unlock"></i>' : '<i class="bi bi-lock"></i>';
            btnBloquear.title = usuario.bloqueado ? 'Desbloquear usuario' : 'Bloquear usuario';
            
            btnBloquear.onclick = async () => {
                try {
                    await cambiarEstadoBloqueo(usuario.email, !usuario.bloqueado);
                    mostrarUsuarios();
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error al cambiar el estado del usuario');
                }
            };
            
            const btnEliminar = document.createElement('button');
            btnEliminar.className = 'btn btn-sm btn-danger';
            btnEliminar.innerHTML = '<i class="bi bi-trash"></i>';
            btnEliminar.title = 'Eliminar usuario';
            
            btnEliminar.onclick = async () => {
                if (confirm(`¿Está seguro que desea eliminar al usuario ${usuario.nombre}?`)) {
                    try {
                        await eliminarUsuario(usuario.email);
                        mostrarUsuarios();
                    } catch (error) {
                        console.error('Error:', error);
                        alert('Error al eliminar el usuario');
                    }
                }
            };
            
            botonesAccion.appendChild(btnBloquear);
            botonesAccion.appendChild(btnEliminar);
            li.appendChild(userInfo);
            li.appendChild(botonesAccion);
            lista.appendChild(li);
        });
    };
    
    request.onerror = () => {
        console.error('Error al obtener usuarios:', request.error);
        alert('Error al cargar la lista de usuarios');
    };
}

// Funciones de UI
function cargarCiudades() {
    const origenSelect = document.getElementById('ciudad-origen');
    const destinoSelect = document.getElementById('ciudad-destino');
    
    ciudadesGE.forEach(ciudad => {
        const optionOrigen = document.createElement('option');
        const optionDestino = document.createElement('option');
        optionOrigen.value = optionDestino.value = ciudad;
        optionOrigen.textContent = optionDestino.textContent = ciudad;
        origenSelect.appendChild(optionOrigen);
        destinoSelect.appendChild(optionDestino.cloneNode(true));
    });
}

function cargarConfiguracion() {
    obtenerConfiguracion().then(config => {
        document.getElementById('nombre-empresa').value = config.nombreEmpresa || '';
        document.getElementById('telefono-empresa').value = config.telefonoEmpresa || '';
        
        const logoPreview = document.getElementById('logo-preview');
        if (config.logoEmpresa) {
            logoPreview.src = config.logoEmpresa;
            logoPreview.style.display = 'block';
        } else {
            logoPreview.style.display = 'none';
        }
    }).catch(error => {
        console.error('Error al cargar la configuración:', error);
    });
}

// Guardar factura en la base de datos
async function guardarFactura(factura) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['facturas'], 'readwrite');
        const store = transaction.objectStore('facturas');
        const request = store.add(factura);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Obtener todas las facturas
async function obtenerFacturas() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['facturas'], 'readonly');
        const store = transaction.objectStore('facturas');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Obtener una factura específica por su número de transacción
async function obtenerFactura(numeroTransaccion) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['facturas'], 'readonly');
        const store = transaction.objectStore('facturas');
        const request = store.get(numeroTransaccion);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Calcular comisión basada en el nuevo esquema
function calcularComision(monto) {
    // De 1 a 20,000 XAF -> 500 XAF
    // Cada 20,000 XAF adicionales -> +500 XAF
    const baseComision = 500;
    const intervalo = 20000;
    const incremento = 500;
    
    // Calcular cuántos intervalos completos hay en el monto
    const intervalos = Math.ceil(monto / intervalo);
    
    // Calcular la comisión
    return intervalos * incremento;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const signinForm = document.getElementById('signin-form');
    const showLoginLink = document.getElementById('show-login');
    const showRegisterLink = document.getElementById('show-register');
    const verUsuariosBtn = document.getElementById('ver-usuarios');
    const verHistorialBtn = document.getElementById('ver-historial');
    const verReportesBtn = document.getElementById('ver-reportes');
    const verConfiguracionBtn = document.getElementById('ver-configuracion');
    const verInformateBtn = document.getElementById('ver-informate');
    const volverEnvioBtn = document.getElementById('volver-envio');
    const volverDesdeHistorialBtn = document.getElementById('volver-desde-historial');
    const volverDesdeConfiguracionBtn = document.getElementById('volver-desde-configuracion');
    const volverDesdeInformateBtn = document.getElementById('volver-desde-informate');
    const volverDesdeReportesBtn = document.getElementById('volver-desde-reportes');
    const imprimirFacturaBtn = document.getElementById('imprimir-factura');
    const volverDesdeFacturaBtn = document.getElementById('volver-desde-factura');
    const cerrarSesionBtn = document.getElementById('cerrar-sesion');

    // Modal elements
    const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
    const accessKeyInput = document.getElementById('accessKey');
    const validatePasswordBtn = document.getElementById('validatePassword');
    const passwordError = document.getElementById('passwordError');
    const showPasswordToggle = document.getElementById('showPasswordToggle');

    let targetSection = null; // Store the section to show after password validation

    const transferPasswordModal = new bootstrap.Modal(document.getElementById('transferPasswordModal'));
    const transferKeyInput = document.getElementById('transferKey');
    const validateTransferPasswordBtn = document.getElementById('validateTransferPassword');
    const transferPasswordError = document.getElementById('transferPasswordError');
    const showTransferPasswordToggle = document.getElementById('showTransferPasswordToggle');
    
    cargarCiudades();
    cargarConfiguracion();

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre').value;
        const email = document.getElementById('email').value;
        const dip = document.getElementById('dip').value;
        const password = document.getElementById('password').value;

        // Validaciones
        if (!email.endsWith('@gmail.com')) {
            alert('El correo debe ser de Gmail');
            return;
        }
        if (dip.length !== 9 || isNaN(dip)) {
            alert('El DIP debe ser un número de 9 dígitos');
            return;
        }
        if (password.length !== 8 || 
            !/[A-Z]/.test(password) || 
            !/\d{4}/.test(password)) {
            alert('La contraseña debe tener 8 caracteres, incluir una mayúscula y un número de 4 dígitos');
            return;
        }

        try {
            await registrarUsuario({ nombre, email, dip, password });
            alert('Usuario registrado con éxito');
            document.getElementById('registro-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
        } catch (error) {
            alert('Error al registrar usuario');
        }
    });

    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const usuario = await validarLogin(email, password);
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
        } catch (error) {
            alert('Credenciales inválidas');
        }
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registro-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    });

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('registro-form').style.display = 'block';
    });

    verUsuariosBtn.addEventListener('click', () => {
        targetSection = 'usuarios';
        passwordModal.show();
    });

    verHistorialBtn.addEventListener('click', () => {
        targetSection = 'historial';
        passwordModal.show();
    });

    verReportesBtn.addEventListener('click', () => {
        targetSection = 'reportes';
        passwordModal.show();
    });

    verConfiguracionBtn.addEventListener('click', () => {
        targetSection = 'configuracion';
        passwordModal.show();
    });

    volverEnvioBtn.addEventListener('click', () => {
        document.getElementById('usuarios-lista').style.display = 'none';
        document.getElementById('historial-section').style.display = 'none';
        document.getElementById('formulario-envio').style.display = 'block';
    });

    volverDesdeHistorialBtn.addEventListener('click', () => {
        document.getElementById('historial-section').style.display = 'none';
        document.getElementById('formulario-envio').style.display = 'block';
    });

    volverDesdeConfiguracionBtn.addEventListener('click', () => {
        document.getElementById('configuracion-section').style.display = 'none';
        document.getElementById('formulario-envio').style.display = 'block';
    });

    volverDesdeInformateBtn.addEventListener('click', () => {
        document.getElementById('informate-section').style.display = 'none';
        document.getElementById('formulario-envio').style.display = 'block';
    });

    volverDesdeReportesBtn.addEventListener('click', () => {
        document.getElementById('reportes-section').style.display = 'none';
        document.getElementById('formulario-envio').style.display = 'block';
    });

    cerrarSesionBtn.addEventListener('click', () => {
        if(confirm('¿Está seguro que desea cerrar la sesión?')) {
            document.getElementById('main-app').style.display = 'none';
            document.getElementById('auth-container').style.display = 'block';
            document.getElementById('registro-form').style.display = 'block';
            document.getElementById('login-form').style.display = 'none';
            // Limpiar formularios
            document.getElementById('signup-form').reset();
            document.getElementById('signin-form').reset();
            document.getElementById('envio-form').reset();
        }
    });

    if (volverDesdeFacturaBtn) {
        volverDesdeFacturaBtn.addEventListener('click', () => {
            document.getElementById('factura-section').style.display = 'none';
            document.getElementById('formulario-envio').style.display = 'block';
        });
    }
    
    document.getElementById('logo-empresa').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                document.getElementById('logo-preview').src = event.target.result;
                document.getElementById('logo-preview').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
    
    document.getElementById('config-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const nombreEmpresa = document.getElementById('nombre-empresa').value;
        const telefonoEmpresa = document.getElementById('telefono-empresa').value;
        
        let logoEmpresa = null;
        const logoPreview = document.getElementById('logo-preview');
        if (logoPreview.style.display !== 'none') {
            logoEmpresa = logoPreview.src;
        }

        // Obtener el email a desbloquear
        const unlockEmail = document.getElementById('unlock-email').value;
        
        try {
            await guardarConfiguracion({
                nombreEmpresa,
                telefonoEmpresa,
                logoEmpresa
            });

            // Desbloquear usuario si se proporciona un email
            if (unlockEmail) {
                try {
                    await cambiarEstadoBloqueo(unlockEmail, false);
                    alert(`Usuario con correo ${unlockEmail} desbloqueado correctamente`);
                } catch (unlockError) {
                    console.error('Error al desbloquear usuario:', unlockError);
                    alert(`Error al desbloquear usuario: ${unlockError}`);
                } finally {
                    document.getElementById('unlock-email').value = ''; // Limpiar el campo
                }
            }
            
            alert('Configuración guardada correctamente');
        } catch (error) {
            console.error('Error al guardar la configuración:', error);
            alert('Error al guardar la configuración');
        }
    });
    
    document.getElementById('envio-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show transfer password modal instead of processing form directly
        transferPasswordModal.show();
        transferKeyInput.value = '';
        transferPasswordError.style.display = 'none';
    });

    // Add transfer password validation
    validateTransferPasswordBtn.addEventListener('click', async () => {
        const enteredPassword = transferKeyInput.value;
        const correctPassword = "#060793";
        
        if (enteredPassword === correctPassword) {
            transferPasswordModal.hide();
            transferPasswordError.style.display = 'none';
            transferKeyInput.value = '';
            
            // Get form data
            const remitenteNombre = document.getElementById('remitente-nombre').value;
            const remitenteDip = document.getElementById('remitente-dip').value;
            const origen = document.getElementById('ciudad-origen').value;
            const destino = document.getElementById('ciudad-destino').value;
            const receptorNombre = document.getElementById('receptor-nombre').value;
            const receptorTelefono = document.getElementById('receptor-telefono').value;
            const receptorDip = document.getElementById('receptor-dip').value;
            const monto = document.getElementById('monto').value;
            
            // Validate data
            if (origen === destino) {
                alert('La ciudad de origen y destino no pueden ser la misma');
                return;
            }

            if (remitenteDip.length !== 9 || isNaN(remitenteDip)) {
                alert('El DIP del remitente debe ser un número de 9 dígitos');
                return;
            }

            if (receptorDip.length !== 9 || isNaN(receptorDip)) {
                alert('El DIP del receptor debe ser un número de 9 dígitos');
                return;
            }

            if (!/^\+?[\d\s-]+$/.test(receptorTelefono)) {
                alert('Por favor, ingrese un número de teléfono válido');
                return;
            }
            
            // Process transfer
            const datosFactura = {
                remitenteNombre,
                remitenteDip,
                origen,
                destino,
                receptorNombre,
                receptorTelefono,
                receptorDip,
                monto,
                fecha: new Date(),
                numeroTransaccion: generarNumeroTransaccion()
            };

            // Generate and save invoice
            await generarFactura(datosFactura);
            try {
                await guardarFactura(datosFactura);
                console.log('Factura guardada correctamente');
                document.getElementById('envio-form').reset();
            } catch (error) {
                console.error('Error al guardar la factura:', error);
            }
        } else {
            transferPasswordError.style.display = 'block';
        }
    });

    // Add toggle for transfer password visibility
    let transferPasswordVisible = false;
    showTransferPasswordToggle.addEventListener('click', () => {
        transferPasswordVisible = !transferPasswordVisible;
        const type = transferPasswordVisible ? 'text' : 'password';
        transferKeyInput.type = type;
        showTransferPasswordToggle.innerHTML = transferPasswordVisible ? 
            '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    });

    // Agregar íconos de Bootstrap
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css';
    document.head.appendChild(link);
    
    validatePasswordBtn.addEventListener('click', () => {
        const enteredPassword = accessKeyInput.value;
        const correctPassword = "#Ivan2022";
        
        if (enteredPassword === correctPassword) {
            passwordModal.hide();
            passwordError.style.display = 'none';
            accessKeyInput.value = '';
            
            // Ocultar todas las secciones primero
            document.getElementById('formulario-envio').style.display = 'none';
            document.getElementById('factura-section').style.display = 'none';
            document.getElementById('historial-section').style.display = 'none';
            document.getElementById('usuarios-lista').style.display = 'none';
            document.getElementById('configuracion-section').style.display = 'none';
            document.getElementById('informate-section').style.display = 'none';
            document.getElementById('reportes-section').style.display = 'none';
            
            // Mostrar la sección correspondiente
            switch(targetSection) {
                case 'usuarios':
                    document.getElementById('usuarios-lista').style.display = 'block';
                    mostrarUsuarios();
                    break;
                case 'historial':
                    document.getElementById('historial-section').style.display = 'block';
                    mostrarHistorialFacturas();
                    break;
                case 'reportes':
                    document.getElementById('reportes-section').style.display = 'block';
                    mostrarReportes();
                    break;
                case 'configuracion':
                    document.getElementById('configuracion-section').style.display = 'block';
                    cargarConfiguracion();
                    break;
            }
        } else {
            passwordError.style.display = 'block';
        }
    });

    // Añadir evento para el botón de ver infórmate
    verInformateBtn.addEventListener('click', () => {
        document.getElementById('formulario-envio').style.display = 'none';
        document.getElementById('factura-section').style.display = 'none';
        document.getElementById('historial-section').style.display = 'none';
        document.getElementById('usuarios-lista').style.display = 'none';
        document.getElementById('configuracion-section').style.display = 'none';
        document.getElementById('reportes-section').style.display = 'none';
        document.getElementById('informate-section').style.display = 'block';
    });

    // Show/Hide Password Toggle
    let passwordVisible = false;
    showPasswordToggle.addEventListener('click', () => {
        passwordVisible = !passwordVisible;
        const type = passwordVisible ? 'text' : 'password';
        accessKeyInput.type = type;
        showPasswordToggle.innerHTML = passwordVisible ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    });
});

// Generar número único de transacción
function generarNumeroTransaccion() {
    return 'TX-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 1000);
}

// Función para generar la factura
async function generarFactura(datos) {
    // Obtener configuración
    const config = await obtenerConfiguracion();
    
    // Calcular comisión con el nuevo esquema (reemplaza el 5% anterior)
    const comision = calcularComision(datos.monto);
    const total = parseFloat(datos.monto) + parseFloat(comision);
    
    // Formatear la fecha
    const fechaFormateada = new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(datos.fecha instanceof Date ? datos.fecha : new Date(datos.fecha));
    
    // Preparar el logo
    const logoHTML = config.logoEmpresa ? 
        `<div class="text-center mb-3"><img src="${config.logoEmpresa}" style="max-height: 60px; max-width: 180px;"></div>` : '';
    
    // Crear el contenido de la factura
    const facturaHTML = `
        <div class="factura-header">
            ${logoHTML}
            <h2>${config.nombreEmpresa}</h2>
            <p class="badge bg-primary fs-6">Comprobante de Transferencia</p>
            <div class="row">
                <div class="col-6 text-start">
                    <small><strong>Fecha:</strong> ${fechaFormateada}</small>
                </div>
                <div class="col-6 text-end">
                    <small><strong>N° de Transacción:</strong> ${datos.numeroTransaccion}</small>
                </div>
            </div>
            <p><small><strong>Teléfono:</strong> ${config.telefonoEmpresa}</small></p>
        </div>
        <table class="factura-tabla table table-striped table-sm">
            <tr class="factura-seccion table-primary">
                <th colspan="2">Datos del Remitente</th>
            </tr>
            <tr>
                <td style="width: 40%"><strong>Nombre:</strong></td>
                <td>${datos.remitenteNombre}</td>
            </tr>
            <tr>
                <td><strong>DIP:</strong></td>
                <td>${datos.remitenteDip}</td>
            </tr>
            <tr>
                <td><strong>Ciudad Origen:</strong></td>
                <td>${datos.origen}</td>
            </tr>
            
            <tr class="factura-seccion table-primary">
                <th colspan="2">Datos del Receptor</th>
            </tr>
            <tr>
                <td><strong>Nombre:</strong></td>
                <td>${datos.receptorNombre}</td>
            </tr>
            <tr>
                <td><strong>DIP:</strong></td>
                <td>${datos.receptorDip}</td>
            </tr>
            <tr>
                <td><strong>Teléfono:</strong></td>
                <td>${datos.receptorTelefono}</td>
            </tr>
            <tr>
                <td><strong>Ciudad Destino:</strong></td>
                <td>${datos.destino}</td>
            </tr>
            
            <tr class="factura-seccion table-primary">
                <th colspan="2">Detalles del Envío</th>
            </tr>
            <tr>
                <td><strong>Monto Enviado:</strong></td>
                <td>${parseFloat(datos.monto).toLocaleString('es-ES')} XAF</td>
            </tr>
            <tr>
                <td><strong>Comisión:</strong></td>
                <td>${comision.toLocaleString('es-ES')} XAF</td>
            </tr>
            <tr class="factura-total table-success">
                <td><strong>Total:</strong></td>
                <td>${total.toLocaleString('es-ES')} XAF</td>
            </tr>
        </table>
        <div class="factura-footer">
            <div class="row mt-4">
                <div class="col-5">
                    <div class="firma-box mx-auto">
                        <div class="border-top pt-2">
                            <p class="text-center mb-0 small fw-bold">Firma del Gerente</p>
                        </div>
                    </div>
                </div>
                <div class="col-2"></div>
                <div class="col-5">
                    <div class="firma-box mx-auto">
                        <div class="border-top pt-2">
                            <p class="text-center mb-0 small fw-bold">Firma del Cliente</p>
                        </div>
                    </div>
                </div>
            </div>
            <p class="fw-bold mt-4">Gracias por utilizar nuestros servicios</p>
            <p class="small">Esta factura es un documento oficial de ${config.nombreEmpresa}</p>
        </div>
    `;
    
    // Mostrar la factura en la interfaz
    const facturaContainer = document.getElementById('factura-container');
    facturaContainer.innerHTML = facturaHTML;
    facturaContainer.classList.add('shadow');
    document.getElementById('factura-section').style.display = 'block';
    
    // Simular la generación automática de PDF
    setTimeout(() => {
        generarPDF(datos, config);
    }, 500);
}

// Nueva función para generar PDF automáticamente
async function generarPDF(datos, configObj) {
    const config = configObj || await obtenerConfiguracion();
    
    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
        <html>
        <head>
            <title>Factura ECUA-SENDER - ${datos.numeroTransaccion}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                @page { size: A4; margin: 1.5cm; }
                body { font-family: 'Calibri', sans-serif; }
                .factura-container {
                    max-width: 100%;
                    margin: 0 auto;
                    padding: 20px;
                }
                .factura-header { text-align: center; margin-bottom: 1rem; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
                .factura-header h2 { margin-bottom: 0.3rem; color: #2d5b88; font-weight: bold; font-size: 1.6rem; }
                .factura-tabla { width: 100%; border-collapse: collapse; margin-bottom: 1rem; border: 2px solid #dee2e6; }
                .factura-tabla td, .factura-tabla th { padding: 0.5rem; border: 1px solid #dee2e6; font-size: 0.9rem; }
                .factura-seccion { background-color: #e9ecef; text-align: left; font-weight: bold; color: #2c3e50; border-bottom: 2px solid #adb5bd; }
                .factura-total { font-weight: bold; background-color: #f8f9fa; border-top: 2px solid #adb5bd; }
                .factura-footer { text-align: center; margin-top: 1rem; border-top: 1px dashed #adb5bd; padding-top: 0.5rem; color: #6c757d; font-size: 0.8rem; }
                .firma-box { width: 100%; max-width: 150px; margin-top: 1rem; }
                .firma-box .border-top { border-top: 1px solid #333 !important; }
                @media print { body { padding: 0; margin: 0; } }
            </style>
        </head>
        <body>
            <div class="factura-container">
                ${document.getElementById('factura-container').innerHTML}
            </div>
        </body>
        </html>
    `);
    ventanaImpresion.document.close();
    
    // Auto imprimir después de un pequeño retraso
    setTimeout(() => {
        ventanaImpresion.print();
    }, 500);
}

// Función para mostrar el historial de facturas
async function mostrarHistorialFacturas() {
    try {
        const facturas = await obtenerFacturas();
        const listaFacturas = document.getElementById('facturas-lista');
        listaFacturas.innerHTML = '';
        
        if (facturas.length === 0) {
            listaFacturas.innerHTML = '<div class="list-group-item text-center text-muted">No hay facturas en el historial</div>';
            return;
        }
        
        // Ordenar facturas por fecha (más recientes primero)
        facturas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        facturas.forEach(factura => {
            const fechaFormateada = new Intl.DateTimeFormat('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date(factura.fecha));
            
            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action factura-item d-flex justify-content-between align-items-center';
            item.dataset.transaccion = factura.numeroTransaccion;
            
            const comision = factura.monto * 0.05;
            const total = parseFloat(factura.monto) + parseFloat(comision);
            
            item.innerHTML = `
                <div>
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${factura.remitenteNombre} → ${factura.receptorNombre}</h5>
                        <span class="monto">${parseFloat(total).toLocaleString('es-ES')} XAF</span>
                    </div>
                    <p class="mb-1">${factura.origen} a ${factura.destino}</p>
                    <small class="fecha">${fechaFormateada} · ${factura.numeroTransaccion}</small>
                </div>
            `;
            
            item.addEventListener('click', () => mostrarFacturaDesdeHistorial(factura.numeroTransaccion));
            listaFacturas.appendChild(item);
        });
    } catch (error) {
        console.error('Error al cargar el historial de facturas:', error);
    }
}

// Función para mostrar una factura desde el historial
async function mostrarFacturaDesdeHistorial(numeroTransaccion) {
    try {
        const factura = await obtenerFactura(numeroTransaccion);
        if (factura) {
            await generarFactura(factura);
            document.getElementById('historial-section').style.display = 'none';
            document.getElementById('factura-section').style.display = 'block';
        }
    } catch (error) {
        console.error('Error al mostrar la factura:', error);
    }
}

// Función para generar datos para los reportes
async function generarDatosReportes() {
    // Obtener todas las facturas
    const facturas = await obtenerFacturas();
    
    // Agrupar por fecha (día)
    const transferenciasPorDia = {};
    const comisionesPorDia = {};
    
    // Agrupar por ciudad destino
    const transferenciasPorCiudad = {};
    
    facturas.forEach(factura => {
        // Formato de fecha: YYYY-MM-DD
        const fecha = new Date(factura.fecha);
        const fechaStr = fecha.toISOString().split('T')[0];
        
        // Contar transferencias por día
        if (!transferenciasPorDia[fechaStr]) {
            transferenciasPorDia[fechaStr] = 0;
        }
        transferenciasPorDia[fechaStr]++;
        
        // Calcular comisiones por día
        if (!comisionesPorDia[fechaStr]) {
            comisionesPorDia[fechaStr] = 0;
        }
        const comision = calcularComision(factura.monto);
        comisionesPorDia[fechaStr] += comision;
        
        // Contar transferencias por ciudad destino
        if (!transferenciasPorCiudad[factura.destino]) {
            transferenciasPorCiudad[factura.destino] = 0;
        }
        transferenciasPorCiudad[factura.destino]++;
    });
    
    return {
        transferenciasPorDia,
        comisionesPorDia,
        transferenciasPorCiudad
    };
}

// Función para mostrar reportes
async function mostrarReportes() {
    try {
        const datos = await generarDatosReportes();
        
        // Preparar datos para gráficos
        const fechas = Object.keys(datos.transferenciasPorDia).sort();
        const transferencias = fechas.map(fecha => datos.transferenciasPorDia[fecha]);
        const comisiones = fechas.map(fecha => datos.comisionesPorDia[fecha]);
        
        // Preparar datos para gráfico de ciudades
        const ciudades = Object.keys(datos.transferenciasPorCiudad);
        const totalesCiudades = ciudades.map(ciudad => datos.transferenciasPorCiudad[ciudad]);
        
        // Ordenar ciudades por número de transferencias (descendente)
        const ciudadesOrdenadas = ciudades.map((ciudad, index) => ({
            ciudad,
            total: totalesCiudades[index]
        })).sort((a, b) => b.total - a.total);
        
        // Tomar las 5 ciudades con más transferencias para el gráfico de torta
        const top5Ciudades = ciudadesOrdenadas.slice(0, 5);
        
        // Limpiar canvas existentes si los hay
        document.getElementById('grafico-transferencias').innerHTML = '<canvas id="chart-transferencias"></canvas>';
        document.getElementById('grafico-comisiones').innerHTML = '<canvas id="chart-comisiones"></canvas>';
        document.getElementById('grafico-ciudades').innerHTML = '<canvas id="chart-ciudades"></canvas>';
        
        // Crear gráfico de barras para transferencias por día
        const ctxTransferencias = document.getElementById('chart-transferencias').getContext('2d');
        new Chart(ctxTransferencias, {
            type: 'bar',
            data: {
                labels: fechas.map(fecha => formatearFecha(fecha)),
                datasets: [{
                    label: 'Transferencias por día',
                    data: transferencias,
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Transferencias diarias'
                    }
                }
            }
        });
        
        // Crear gráfico de barras para comisiones por día
        const ctxComisiones = document.getElementById('chart-comisiones').getContext('2d');
        new Chart(ctxComisiones, {
            type: 'bar',
            data: {
                labels: fechas.map(fecha => formatearFecha(fecha)),
                datasets: [{
                    label: 'Comisiones por día (XAF)',
                    data: comisiones,
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Ingresos por comisiones diarias'
                    }
                }
            }
        });
        
        // Crear gráfico de torta para ciudades con más transferencias
        const ctxCiudades = document.getElementById('chart-ciudades').getContext('2d');
        new Chart(ctxCiudades, {
            type: 'pie',
            data: {
                labels: top5Ciudades.map(item => item.ciudad),
                datasets: [{
                    label: 'Transferencias por ciudad',
                    data: top5Ciudades.map(item => item.total),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Ciudades con más transferencias'
                    },
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
        
        // Crear tabla de resumen
        const tablaResumen = document.getElementById('tabla-resumen');
        let tablaHTML = `
            <table class="table table-striped table-hover">
                <thead class="table-primary">
                    <tr>
                        <th>Fecha</th>
                        <th>Transferencias</th>
                        <th>Comisiones (XAF)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        let totalTransferencias = 0;
        let totalComisiones = 0;
        
        fechas.forEach((fecha, index) => {
            const numTransferencias = transferencias[index];
            const comision = comisiones[index];
            totalTransferencias += numTransferencias;
            totalComisiones += comision;
            
            tablaHTML += `
                <tr>
                    <td>${formatearFecha(fecha)}</td>
                    <td>${numTransferencias}</td>
                    <td>${comision.toLocaleString('es-ES')}</td>
                </tr>
            `;
        });
        
        tablaHTML += `
                </tbody>
                <tfoot class="table-success fw-bold">
                    <tr>
                        <td>TOTAL</td>
                        <td>${totalTransferencias}</td>
                        <td>${totalComisiones.toLocaleString('es-ES')}</td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        tablaResumen.innerHTML = tablaHTML;
        
    } catch (error) {
        console.error('Error al generar reportes:', error);
        document.getElementById('reportes-section').innerHTML = `
            <div class="alert alert-danger">
                Error al generar los reportes: ${error.message}
            </div>
        `;
    }
}

// Formato de fecha para los gráficos
function formatearFecha(fechaStr) {
    const fecha = new Date(fechaStr + 'T00:00:00'); 
    return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
}