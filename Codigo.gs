function doGet(e) {
  var page = e.parameter.page;

  if (page === "PanelAdmin") {
    var t = HtmlService.createTemplateFromFile('PanelAdmin');
    return t.evaluate()
      .setTitle('Panel de Administrador')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else if (page === "PanelEmpleado") {
    var t = HtmlService.createTemplateFromFile('PanelEmpleado');
    t.usuario = e.parameter.usuario || "usuarioDesconocido";
    return t.evaluate()
      .setTitle('Panel de Empleado')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    var datos = SHEET_USUARIOS.getDataRange().getValues();
    var existeAdmin = datos.some(row => row[4] === "Administrador");
    if (existeAdmin) {
      return HtmlService.createHtmlOutputFromFile('Login')
        .setTitle('Inicio de Sesión')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } else {
      return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('Registro de Administrador')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }
}

var SHEET_USUARIOS = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");

/**
 * Función para registrar el primer administrador
 */
function registrarPrimerAdmin(nombre, usuario, contraseña) {
  var datos = SHEET_USUARIOS.getDataRange().getValues();

  // Verifica si ya hay un administrador registrado
  var existeAdmin = datos.some(row => row[4] === "Administrador");

  if (existeAdmin) {
    return { success: false, message: "Ya existe un administrador registrado." };
  }

  // Agrega el primer administrador
  SHEET_USUARIOS.appendRow([Date.now(), nombre, usuario, contraseña, "Administrador", 0]);
  return { success: true, message: "Administrador registrado con éxito." };
}

function validarLogin(usuario, contraseña) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = sheet.getDataRange().getValues();
  var webAppUrl = ScriptApp.getService().getUrl(); // Obtiene la URL base de la app

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][2] === usuario && datos[i][3] === contraseña) {
      var rol = datos[i][4];
      if (rol === "Administrador") {
        return {
          success: true,
          message: "Ingreso exitoso como Administrador",
          redirect: webAppUrl + "?page=PanelAdmin"
        };
      } else if (rol === "Empleado") {
        // Se añade el parámetro "usuario" a la URL para identificar al empleado
        return {
          success: true,
          message: "Ingreso exitoso como Empleado",
          redirect: webAppUrl + "?page=PanelEmpleado&usuario=" + encodeURIComponent(usuario)
        };
      }
    }
  }
  return { success: false, message: "Usuario o contraseña incorrectos" };
}

function mostrarLogin() {
  return HtmlService.createHtmlOutputFromFile('Login')
    .setTitle('Inicio de Sesión')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Obtiene la lista de empleados.
 * Retorna un arreglo de arreglos: [ID, Nombre, Usuario, Rol, Correo]
 */
function obtenerEmpleados() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = sheet.getDataRange().getValues();
  var empleados = [];
  // Se asume que la fila 1 es la cabecera
  for (var i = 1; i < datos.length; i++) {
    empleados.push({
      id: datos[i][0],
      nombre: datos[i][1],
      usuario: datos[i][2],
      rol: datos[i][4],
      correo: datos[i][7] ? datos[i][7] : ""
    });
  }
  return empleados;
}

/**
 * Registra un nuevo empleado (rol "Empleado").
 */
function registrarEmpleado(nombre, usuario, contrasena, correo, rol) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  // Se agrega el empleado con 8 columnas:
  // 1: ID, 2: Nombre, 3: Usuario, 4: Contraseña, 5: Rol,
  // 6: Horas Acumuladas (Extra) (inicialmente 0),
  // 7: Horas Normales (inicialmente 0),
  // 8: Correo (opcional)
  sheet.appendRow([Date.now(), nombre, usuario, contrasena, rol, 0, 0, correo || ""]);
  return { success: true, message: "Empleado registrado correctamente" };
}


/**
 * Edita los datos de un empleado.
 * Solo se actualiza la contraseña si se ingresa un valor (de lo contrario, se mantiene la anterior).
 */
function editarEmpleado(id, nombre, usuario, contrasena, correo) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = sheet.getDataRange().getValues();

  // Se asume que el ID es único y se encuentra en la primera columna.
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0].toString() === id.toString()) {
      // Actualiza: Nombre (columna 2), Usuario (columna 3)
      sheet.getRange(i + 1, 2).setValue(nombre);
      sheet.getRange(i + 1, 3).setValue(usuario);
      // Actualiza la contraseña solo si se ingresó un valor (no vacío)
      if (contrasena && contrasena.trim() !== "") {
        sheet.getRange(i + 1, 4).setValue(contrasena);
      }
      // Actualiza Correo en la columna 8 (índice 7)
      sheet.getRange(i + 1, 8).setValue(correo);
      return { success: true, message: "Empleado actualizado correctamente" };
    }
  }
  return { success: false, message: "Empleado no encontrado" };
}

/**
 * Elimina a un empleado de la hoja.
 */
function eliminarEmpleado(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = sheet.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Empleado eliminado correctamente" };
    }
  }
  return { success: false, message: "Empleado no encontrado" };
}

/**
 * Registra la entrada de un empleado.
 * Se asume que "usuario" es el identificador único (login) del empleado.
 */
function registrarEntradaEmpleado(usuario) {
  var hojaAsistencia = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  var fechaHoy = new Date();
  var fechaStr = Utilities.formatDate(fechaHoy, Session.getScriptTimeZone(), "yyyy-MM-dd");

  // Verificar si ya existe registro de entrada hoy para este usuario
  var datos = hojaAsistencia.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === usuario && datos[i][2] === fechaStr) {
      return { success: false, message: "Ya se registró la entrada hoy." };
    }
  }

  // Registrar entrada
  hojaAsistencia.appendRow([Date.now(), usuario, fechaStr, fechaHoy, "", 0]);
  return { success: true, message: "Entrada registrada a las " + Utilities.formatDate(fechaHoy, Session.getScriptTimeZone(), "HH:mm:ss") };
}

/**
 * Registra la salida de un empleado.
 */
function registrarSalidaEmpleado(usuario) {
  var hojaAsistencia = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  var fechaHoy = new Date();
  var fechaStr = Utilities.formatDate(fechaHoy, Session.getScriptTimeZone(), "yyyy-MM-dd");

  var datos = hojaAsistencia.getDataRange().getValues();
  var filaEncontrada = -1;
  for (var i = 1; i < datos.length; i++) {
    var registroFecha = Utilities.formatDate(new Date(datos[i][2]), Session.getScriptTimeZone(), "yyyy-MM-dd");
    // Se busca el registro del día en que el usuario ingresó y que la celda de Hora Salida esté vacía
    if (datos[i][1] === usuario && registroFecha === fechaStr && !datos[i][4]) {
      filaEncontrada = i + 1; // Las filas en Sheets comienzan en 1
      break;
    }
  }

  if (filaEncontrada === -1) {
    return { success: false, message: "No se encontró registro de entrada o ya se registró la salida." };
  }

  // Calcular la diferencia en horas entre la hora de entrada y la hora de salida
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  var horaEntrada = hoja.getRange(filaEncontrada, 4).getValue(); // Columna "Hora Entrada"
  var diferencia = (fechaHoy - new Date(horaEntrada)) / (1000 * 60 * 60); // Diferencia en horas
  diferencia = Math.round(diferencia * 100) / 100; // Redondeo a 2 decimales

  // Separar en horas normales y horas extra (acumuladas)
  var normalHours = (diferencia > 8) ? 8 : diferencia;
  var extraHours = (diferencia > 8) ? diferencia - 8 : 0;

  // Guardar la hora de salida y el total de horas trabajadas en la hoja "Asistencia"
  hoja.getRange(filaEncontrada, 5).setValue(fechaHoy);  // Hora Salida (columna 5)
  hoja.getRange(filaEncontrada, 6).setValue(diferencia);  // Total Horas Trabajadas (columna 6)

  // Actualizar los totales en la hoja "Usuarios"
  var hojaUsuarios = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datosUsuarios = hojaUsuarios.getDataRange().getValues();
  for (var j = 1; j < datosUsuarios.length; j++) {
    if (datosUsuarios[j][2] === usuario) {
      // Columna 6: Horas Acumuladas (Extra)
      // Columna 7: Horas Normales
      var extraAcum = parseFloat(datosUsuarios[j][5]) || 0;
      var normalAcum = parseFloat(datosUsuarios[j][6]) || 0;

      extraAcum += extraHours;
      normalAcum += normalHours;

      hojaUsuarios.getRange(j + 1, 6).setValue(extraAcum);
      hojaUsuarios.getRange(j + 1, 7).setValue(normalAcum);
      break;
    }
  }

  return {
    success: true,
    message: "Salida registrada. Total: " + diferencia + " hrs. (" + normalHours + " hrs normales y " + extraHours + " hrs acumuladas)"
  };
}

/**
 * Consulta las horas acumuladas de un empleado.
 */
function consultarHorasAcumuladas(usuario) {
  var hojaUsuarios = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = hojaUsuarios.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][2] === usuario) {
      var valor = datos[i][5];  // Valor de Horas Acumuladas
      var horas;

      // Si ya es un número, úsalo directamente
      if (typeof valor === "number") {
        horas = valor;
      } else {
        // Si es una cadena, reemplaza la coma por punto y conviértelo a número
        horas = parseFloat(valor.toString().replace(",", "."));
      }

      // En caso de que horas resulte NaN, asignar 0
      if (isNaN(horas)) {
        horas = 0;
      }

      return { success: true, horas: horas };
    }
  }
  return { success: false, message: "Empleado no encontrado." };
}

function consultarTotalHorasSemanal(usuario) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  var datos = hoja.getDataRange().getValues();

  var today = new Date();
  var dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  // Si la semana inicia en lunes, tratamos el domingo (0) como 7
  if (dayOfWeek === 0) {
    dayOfWeek = 7;
  }

  // Calcular el lunes de la semana actual
  var monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  // Calcular el domingo de la semana actual
  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  var totalHoras = 0;
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === usuario) {  // columna 2: Usuario
      var fechaRegistro = new Date(datos[i][2]); // columna 3: Fecha
      if (fechaRegistro >= monday && fechaRegistro <= sunday) {
        var horasTrabajadas = parseFloat(datos[i][5]) || 0; // columna 6: Horas Trabajadas
        totalHoras += horasTrabajadas;
      }
    }
  }
  totalHoras = Math.round(totalHoras * 100) / 100; // redondeo a 2 decimales
  return { success: true, totalHoras: totalHoras };
}

function convertirDecimalAHorasMinutos(decimalHoras) {
  var horas = Math.floor(decimalHoras);
  var minutos = Math.round((decimalHoras - horas) * 60);
  return horas + " horas y " + minutos + " minutos";
}


/**
 * Permite al empleado solicitar descanso usando horas acumuladas.
 */
function solicitarDescanso(usuario, horasSolicitadas, diaDescanso, motivo) {
  var hojaUsuarios = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = hojaUsuarios.getDataRange().getValues();
  var saldoExtra = 0;

  // Buscar al empleado y obtener el saldo de horas extras (asumiendo columna 6: Horas Acumuladas Extra)
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][2] === usuario) {
      saldoExtra = parseFloat(datos[i][5]) || 0;  // columna 6: índice 5
      break;
    }
  }

  if (horasSolicitadas > saldoExtra) {
    return { success: false, message: "No tienes suficientes horas extras para solicitar ese descanso." };
  }

  // Registrar la solicitud en la hoja "Solicitudes"
  var hojaSolicitudes = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Solicitudes");
  // Se asume que la hoja "Solicitudes" tiene: [ID, Usuario, Fecha de Solicitud, Día de Descanso, Horas Solicitadas, Motivo, Estado, Nota Rechazo]
  hojaSolicitudes.appendRow([Date.now(), usuario, Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"), diaDescanso, horasSolicitadas, motivo, "Pendiente", ""]);
  return { success: true, message: "Solicitud de descanso registrada y pendiente de aprobación." };
}


function obtenerReporteAsistenciaAdmin() {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  var datos = hoja.getDataRange().getValues();
  var reporte = [];

  // Suponemos que la fila 1 es la cabecera
  for (var i = 1; i < datos.length; i++) {
    // Datos: 
    // [0] ID, [1] Usuario, [2] Fecha, [3] Hora Entrada, [4] Hora Salida, [5] Horas Trabajadas
    var fecha = Utilities.formatDate(new Date(datos[i][2]), Session.getScriptTimeZone(), "yyyy-MM-dd");
    var horaEntrada = datos[i][3] ? Utilities.formatDate(new Date(datos[i][3]), Session.getScriptTimeZone(), "HH:mm:ss") : "";
    var horaSalida = datos[i][4] ? Utilities.formatDate(new Date(datos[i][4]), Session.getScriptTimeZone(), "HH:mm:ss") : "";
    reporte.push({
      usuario: datos[i][1],
      fecha: fecha,
      horaEntrada: horaEntrada,
      horaSalida: horaSalida,
      totalHoras: datos[i][5]
    });
  }

  return reporte;
}

function obtenerResumenSemanalAdmin() {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  var datos = hoja.getDataRange().getValues();
  // Estructura: [0]ID, [1]Usuario, [2]Fecha, [3]Hora Entrada, [4]Hora Salida, [5]Horas Trabajadas

  var resumen = {}; // clave: usuario + "_" + lunesDeEsaSemana

  for (var i = 1; i < datos.length; i++) {
    var usuario = datos[i][1];
    if (!usuario) continue; // Evitar filas vacías

    // Convertir la fecha
    var fechaRegistro = new Date(datos[i][2]);
    if (isNaN(fechaRegistro.getTime())) continue; // Si es inválida, salta

    // Determinar el lunes de la semana (lunes a domingo)
    var day = fechaRegistro.getDay(); // 0=domingo, 1=lunes, ... 6=sábado
    if (day === 0) day = 7; // Tratar domingo como 7
    var monday = new Date(fechaRegistro);
    monday.setDate(fechaRegistro.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);

    // Crear la clave para agrupar: "usuario_YYYY-MM-DD"
    var key = usuario + "_" + Utilities.formatDate(monday, Session.getScriptTimeZone(), "yyyy-MM-dd");

    // Inicializar el objeto si no existe
    if (!resumen[key]) {
      resumen[key] = {
        usuario: usuario,
        // semana: fecha del lunes en formato YYYY-MM-DD
        semana: Utilities.formatDate(monday, Session.getScriptTimeZone(), "yyyy-MM-dd"),
        totalHoras: 0,
        horasNormales: 0,
        horasExtra: 0
      };
    }

    // Horas trabajadas en ese día
    var horasTrabajadas = parseFloat(datos[i][5]) || 0;

    // Calcular horas normales y extras para ese día
    var dailyNorm = Math.min(8, horasTrabajadas);    // Máximo 8 horas normales al día
    var dailyExtra = Math.max(0, horasTrabajadas - 8); // Lo que exceda de 8h es extra

    // Sumar al acumulado semanal
    resumen[key].totalHoras += horasTrabajadas;
    resumen[key].horasNormales += dailyNorm;
    resumen[key].horasExtra += dailyExtra;
  }

  // Convertir el objeto 'resumen' en un arreglo
  var arrayResumen = [];
  for (var key in resumen) {
    // Redondear a 2 decimales
    resumen[key].totalHoras = Math.round(resumen[key].totalHoras * 100) / 100;
    resumen[key].horasNormales = Math.round(resumen[key].horasNormales * 100) / 100;
    resumen[key].horasExtra = Math.round(resumen[key].horasExtra * 100) / 100;
    arrayResumen.push(resumen[key]);
  }

  return arrayResumen;
}


// Retorna un arreglo de objetos {id, nombre} para listar empleados en "Reporte Detallado".
function obtenerListaEmpleados() {
  var ss = SpreadsheetApp.openById("1HUqUOlDQB20gfkUL6iDlmkD5eDy0ob_EyRHlqH4dklY"); // Reemplaza con el ID real
  var hoja = ss.getSheetByName("Usuarios");
  if (!hoja) {
    Logger.log("No se encontró la hoja 'Usuarios'.");
    return [];
  }
  var datos = hoja.getDataRange().getValues();
  Logger.log("Datos leídos: " + JSON.stringify(datos));

  var empleados = [];
  for (var i = 1; i < datos.length; i++) {
    var id = datos[i][0] ? datos[i][0].toString() : "Sin ID";
    var nombre = datos[i][1] ? datos[i][1].toString() : "Sin Nombre";
    var usuario = datos[i][2] ? datos[i][2].toString() : "Sin Usuario";
    var rol = datos[i][4] ? datos[i][4].toString() : "Sin Rol";
    var correo = datos[i][7] ? datos[i][7].toString() : "Sin Correo";

    empleados.push({ id, nombre, usuario, rol, correo });
  }

  Logger.log("Empleados obtenidos: " + JSON.stringify(empleados));
  return empleados;
}


// Dado un ID, retorna el usuario (login) de la columna 3 en la hoja "Usuarios".
function obtenerUsuarioPorId(id) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
  var datos = hoja.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0].toString() === id.toString()) {
      return datos[i][2]; // Usuario (columna 3)
    }
  }
  return null;
}

// Retorna los registros de asistencia del empleado, agrupados por semanas (lunes a domingo).
function obtenerReporteEmpleado(empleadoId) {
  var usuario = obtenerUsuarioPorId(empleadoId);
  if (!usuario) {
    return [];
  }

  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Asistencia");
  var datos = hoja.getDataRange().getValues();
  var registrosEmpleado = [];

  // Se asume que la fila 1 es cabecera: 
  // Columna 2: Usuario, Columna 3: Fecha, Columna 4: Hora Entrada, Columna 5: Hora Salida, Columna 6: Total Horas
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === usuario) {
      var dateObj = new Date(datos[i][2]);
      var fechaFormatted = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
      var dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      var diaSemana = dias[dateObj.getDay()];
      var fecha = fechaFormatted + " (" + diaSemana + ")";

      var horaEntrada = datos[i][3] ? Utilities.formatDate(new Date(datos[i][3]), Session.getScriptTimeZone(), "HH:mm:ss") : "";
      var horaSalida = datos[i][4] ? Utilities.formatDate(new Date(datos[i][4]), Session.getScriptTimeZone(), "HH:mm:ss") : "";
      var totalHoras = datos[i][5];

      registrosEmpleado.push({
        fecha: fecha,
        horaEntrada: horaEntrada,
        horaSalida: horaSalida,
        totalHoras: totalHoras
      });
    }
  }

  // El resto de la función: agrupar por semana, etc. (se mantiene igual)
  // Agrupar por semana (lunes a domingo) usando la fecha forzada a mediodía
  var grupos = {};
  registrosEmpleado.forEach(function (reg) {
    // Extrae la parte de la fecha (ejemplo: "2025-03-17") y fuerza la hora a mediodía para evitar desfases de zona horaria
    var dateStr = reg.fecha.split(" ")[0]; // Toma la parte "yyyy-MM-dd"
    var dateObj = new Date(dateStr + "T12:00:00"); // Forza la hora a mediodía

    var day = dateObj.getDay();
    if (day === 0) day = 7; // Tratar el domingo como 7
    var monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);
    var fechaInicio = Utilities.formatDate(monday, Session.getScriptTimeZone(), "yyyy-MM-dd");

    var domingo = new Date(monday);
    domingo.setDate(monday.getDate() + 6);
    var fechaFin = Utilities.formatDate(domingo, Session.getScriptTimeZone(), "yyyy-MM-dd");

    var key = fechaInicio + " - " + fechaFin;
    if (!grupos[key]) {
      grupos[key] = { fechaInicio: fechaInicio, fechaFin: fechaFin, registros: [] };
    }
    grupos[key].registros.push(reg);
  });

  var resultado = [];
  for (var key in grupos) {
    resultado.push(grupos[key]);
  }
  resultado.sort(function (a, b) {
    return new Date(b.fechaInicio) - new Date(a.fechaInicio);
  });

  return resultado;
}

function obtenerSolicitudesDescanso() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Solicitudes");
  if (!sheet) {
    Logger.log("Error: No se encontró la hoja 'Solicitudes'");
    return null;
  }

  var datos = sheet.getDataRange().getValues();
  Logger.log("Datos obtenidos: " + JSON.stringify(datos));

  var solicitudes = [];
  for (var i = 1; i < datos.length; i++) {
    Logger.log("Fila " + i + ": " + JSON.stringify(datos[i]));

    if (datos[i][6] && datos[i][6].trim().toLowerCase() === "pendiente") {
      solicitudes.push({
        id: datos[i][0],
        empleado: datos[i][1],
        fechaSolicitud: datos[i][2],
        diaDescanso: datos[i][3],
        horas: parseFloat(datos[i][4]) || 0,
        motivo: datos[i][5]
      });
    }
  }

  Logger.log("Solicitudes pendientes encontradas: " + JSON.stringify(solicitudes));
  return solicitudes.length > 0 ? solicitudes : null;
}



function aprobarSolicitud(id, horasSolicitadas, empleado) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetSolicitudes = ss.getSheetByName("Solicitudes");
  var datos = sheetSolicitudes.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0].toString() === id.toString()) {
      sheetSolicitudes.getRange(i + 1, 7).setValue("Aprobada"); // Columna 7 (Estado)
      // Aquí deberías descontar las horas en la hoja de Usuarios
      return { success: true, message: "Solicitud aprobada y horas descontadas." };
    }
  }
  return { success: false, message: "Solicitud no encontrada." };
}


function rechazarSolicitud(id, empleado, notaRechazo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetSolicitudes = ss.getSheetByName("Solicitudes");
  var datos = sheetSolicitudes.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0].toString() === id.toString()) {
      sheetSolicitudes.getRange(i + 1, 7).setValue("Rechazada"); // Columna 7 (Estado)
      sheetSolicitudes.getRange(i + 1, 8).setValue(notaRechazo);  // Columna 8 (Nota Rechazo)
      return { success: true, message: "Solicitud rechazada y se ha enviado la nota." };
    }
  }
  return { success: false, message: "Solicitud no encontrada." };
}


function rechazarSolicitud(id, empleado, notaRechazo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetSolicitudes = ss.getSheetByName("Solicitudes");
  var datos = sheetSolicitudes.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0].toString() === id.toString()) {
      sheetSolicitudes.getRange(i + 1, 7).setValue("Rechazada"); // Asume columna 7 es Estado
      sheetSolicitudes.getRange(i + 1, 8).setValue(notaRechazo);  // Asume columna 8 es Nota Rechazo
      return { success: true, message: "Solicitud rechazada y se ha enviado la nota." };
    }
  }
  return { success: false, message: "Solicitud no encontrada." };
}

function obtenerMensajesRechazo(usuario) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Solicitudes"); // Ajusta el nombre si es diferente
  var datos = hoja.getDataRange().getValues();
  var mensajes = [];

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][1] === usuario && datos[i][5] === "Rechazada") { // Suponiendo que la columna 5 es el estado
      mensajes.push({
        fecha: datos[i][2], // Ajusta según la columna de fecha
        texto: datos[i][6]  // Ajusta según la columna donde se guarda el motivo del rechazo
      });
    }
  }

  return { success: true, mensajes: mensajes };
}
