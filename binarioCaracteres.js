"use strict";

var caracteres_ordenados = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',' ','á','é','í','ó','ú'];
var caracter_indefinido = "?";

var diccionario_codificacion = {};
var dump_memoria = [];

//Inicializo tamanio palabra en 0 y cantidad palabras 100 (tamanio pantalla 10*10)
var tamanio_palabra = 0;
var cantidad_palabras = 100;

//Cantidad de filas de ram que entran en el frame (usado para el auto-scroll)
var cantidad_por_pantalla = 8;

//Cuántos caracteres había tipeados la última vez que se actualizó la vista.
//Se usa para saber si hay que animar una escritura o un borrado.
var ultima_longitud_texto = 0;

//Colores del panel "Pantalla", estilo hoja de procesador de texto (fondo blanco)
var COLOR_PANTALLA_OK = "#1f2430";
var COLOR_PANTALLA_WARN = "#b45309";


//Genera la codificación,memoria y pantalla según el tamaño de palabra seleccionado por el usuario
function generar_instancia_vacia(){

  var ok = cargar_valores_por_default();
  if (!ok){
    return;
  }

  mostrar_entradas_salidas();
  sonido_generar();

  //Oculto el panel de generar/cargar archivo
  document.getElementById("generar_cargar").classList.add('oculto_inicial');
}

//Muestra memoria y pantalla con el dump de memoria importado. La codificación segun tamaño de palabra.
function generar_instancia_desde_archivo(){

  mostrar_entradas_salidas();
  document.getElementById("generar_cargar").classList.add('oculto_inicial');
}

//Muestra las tablas de codificacion, memoria, pantalla, entrada de texto y botones
function mostrar_entradas_salidas(){

  //Muestro los paneles ANTES de construir su contenido: con display:none no se
  //puede medir ni hacer scrollIntoView() sobre un elemento oculto.
  document.getElementById("tabla_salidas").classList.remove('oculto_inicial');
  document.getElementById("campo_entrada").classList.remove('oculto_inicial');
  document.getElementById("tabla_generar_codificacion").classList.remove('oculto_inicial');

  mostrar_memoria();
  mostrar_pantalla();
  mostrar_tabla_codificacion();
  mostrar_entrada();
  actualizar_estado_teclado_virtual();
}


//Valida el campo "Bits por caracter". Devuelve un entero válido o null si no lo es.
//El máximo depende de cuántos caracteres hay definidos en caracteres_ordenados
//(con longitud fija, 2^bits no puede superar esa cantidad de símbolos disponibles).
function obtener_tamanio_palabra_valido(){

  var valorIngresado = document.getElementById("tamanio_palabra").value;
  var n = parseInt(valorIngresado, 10);
  var maximoBits = Math.floor(Math.log2(caracteres_ordenados.length)); // 5, hay 32 caracteres definidos

  if (isNaN(n) || n < 1 || n > maximoBits){
    alert("Elegí una cantidad de bits por carácter entre 1 y " + maximoBits + ".");
    return null;
  }

  return n;
}


//Carga los valores por defecto segun el tamanio de palabra seleccionado por el usuario.
//Devuelve true si pudo generar la instancia, false si el valor ingresado no era válido.
function cargar_valores_por_default(){

  var tp = obtener_tamanio_palabra_valido();
  if (tp === null){
    return false;
  }
  tamanio_palabra = tp;
  ultima_longitud_texto = 0;

  for (var i = 0; i < tamanio_palabra*cantidad_palabras; i++){
    dump_memoria[i] = "-";
  }

  //Define el diccionario de codificación, con valores por defecto (no definidos por usuario)
  diccionario_codificacion = definir_codificacion(tamanio_palabra, caracteres_ordenados);

  return true;
}


//Devuelve un diccionario con los caracteres del array y una codificacion binaria incremental
function definir_codificacion(tamanio_palabra, caracteres){

  var diccionario_local = {};

  for (var i = 0; i < 2**tamanio_palabra; i++) {
    diccionario_local[i] = caracteres[i];
  }

  return diccionario_local;
}

//Genera la tabla de codificaciones según el diccionario_codificacion
function mostrar_tabla_codificacion(){

  if (document.contains(document.getElementById("campos_codificacion"))) {
    document.getElementById("campos_codificacion").remove();
  }

  var body = document.getElementById("tabla_campos_codificacion");

  var tabla = document.createElement("table");
  tabla.setAttribute("id", "campos_codificacion");
  var tblBody = document.createElement("tbody");

  var hilera = document.createElement("tr");

  var celda = document.createElement("td");
  var textoCelda = document.createTextNode("N°");
  celda.appendChild(textoCelda);
  hilera.appendChild(celda);

  celda = document.createElement("td");
  textoCelda = document.createTextNode("Caracter");
  celda.appendChild(textoCelda);
  hilera.appendChild(celda);

  celda = document.createElement("td");
  textoCelda = document.createTextNode("Binario");
  celda.appendChild(textoCelda);
  hilera.appendChild(celda);
  tblBody.appendChild(hilera);

  for (var i = 0; i < 2**tamanio_palabra; i++) {
    var indiceEnBinario = createBinaryString(i, tamanio_palabra);

    hilera = document.createElement("tr");

    celda = document.createElement("td");
    textoCelda = document.createTextNode(i);
    celda.appendChild(textoCelda);
    hilera.appendChild(celda);

    celda = document.createElement("td");
    var entrada = document.createElement("INPUT");
    entrada.setAttribute("id", "caracter"+i);
    entrada.setAttribute("type", "INPUT");
    entrada.setAttribute("maxlength", 1);
    entrada.setAttribute("size", 1);
    entrada.setAttribute("value", dame_caracter(indiceEnBinario));
    celda.appendChild(entrada);
    hilera.appendChild(celda);

    celda = document.createElement("td");
    entrada = document.createElement("INPUT");
    entrada.setAttribute("id", "codificacion"+i);
    entrada.setAttribute("type", "INPUT");
    entrada.setAttribute("maxlength", tamanio_palabra);
    entrada.setAttribute("size", 5);
    entrada.setAttribute("readonly", true);
    entrada.setAttribute("value", indiceEnBinario);
    celda.appendChild(entrada);
    hilera.appendChild(celda);

    tblBody.appendChild(hilera);
  }

  tabla.appendChild(tblBody);
  body.appendChild(tabla);
}

//Si cambian los valores originales, se rehace la codificación.
//OJO: acá NO se vuelve a leer "Bits por caracter": cambiar la cantidad de bits
//implica regenerar toda la memoria y la pantalla (botón "Generar"), no sólo
//reasignar los caracteres de los códigos que ya existen.
function actualizar_codificacion(){

  for (var i = 0; i < 2**tamanio_palabra; i++){
    var caracter = document.getElementById("caracter"+i).value;
    var codificacion = document.getElementById("codificacion"+i).value;
    var indice_decimal = parseInt(codificacion, 2);
    diccionario_codificacion[indice_decimal] = caracter;
    if (caracter == ""){
      break;
    }
  }

  actualizar_estado_teclado_virtual();

  //Limpia memoria, pantalla y campo de entrada
  limpiar_todo();
}

function mostrar_entrada(){

  if (document.contains(document.getElementById("entrada"))) {
    document.getElementById("entrada").remove();
  }

  var body = document.getElementById("div_entrada");

  var entrada = document.createElement("INPUT");
  entrada.setAttribute("id", "entrada");
  entrada.setAttribute("type", "text");
  entrada.setAttribute("maxlength", cantidad_palabras);
  entrada.setAttribute("placeholder", "Escribí acá...");
  //Uso "input" (no "keypress"): también se dispara al borrar con Backspace/Delete,
  //pegar texto o seleccionar-y-sobreescribir.
  entrada.setAttribute("oninput", "refrescar_ram_pantalla()");

  body.appendChild(entrada);

  //Escucho las teclas físicas para iluminar el teclado gráfico mientras están apretadas
  entrada.addEventListener('keydown', manejar_tecla_presionada);
  entrada.addEventListener('keyup', manejar_tecla_soltada);
}

function mostrar_memoria(){

  if (document.contains(document.getElementById("memoria"))) {
      document.getElementById("memoria").remove();
  }

  var tabla_memoria = document.getElementById("tabla_memoria");

  var tabla = document.createElement("table");
  tabla.setAttribute("id", "memoria");
  var tblBody = document.createElement("tbody");

  var dump_memoria_index = 0;

  for (var i = 0; i < cantidad_palabras; i++) {

    var hilera = document.createElement("tr");
    hilera.setAttribute("id", "fila"+i);

    for (var j = 0; j <= tamanio_palabra; j++) {
      var celda = document.createElement("td");
      var textoCelda;
      var colorTextoFondo;

      //Columna de dirección de memoria
      if (j == 0){
        textoCelda = document.createTextNode(i);
        colorTextoFondo = {"colorFondo": "#1f2b1d", "colorTexto": "#86b96f"};
      } else { //Columnas de bits
        textoCelda = document.createTextNode(dump_memoria[dump_memoria_index]);
        celda.style.fontWeight = '900';
        dump_memoria_index++;
        colorTextoFondo = {"colorFondo": "#141d18", "colorTexto": "#d7e4dc"};
      }

      celda.style.backgroundColor = colorTextoFondo["colorFondo"];
      celda.style.color = colorTextoFondo["colorTexto"];
      celda.appendChild(textoCelda);
      hilera.appendChild(celda);
    }
    tblBody.appendChild(hilera);
  }

  tabla.appendChild(tblBody);
  tabla_memoria.appendChild(tabla);
  desplazar_frame_memoria("fila0");

  //Actualizo la etiqueta decorativa del módulo con el tamaño de palabra actual
  var etiqueta = document.getElementById("etiqueta_ram");
  if (etiqueta){
    etiqueta.textContent = "SIMU-RAM · " + tamanio_palabra + " bit/car";
  }
}

//Construye la vista de Pantalla a partir de dump_memoria (se usa al generar una instancia
//vacía y al importar un archivo). No muestra guiones: las posiciones vacías quedan en blanco,
//como en una hoja de un procesador de texto.
function mostrar_pantalla(){

  if (document.contains(document.getElementById("monitor"))) {
      document.getElementById("monitor").remove();
  }

  var body = document.getElementById("tabla_pantalla");

  var tabla = document.createElement("table");
  tabla.setAttribute("id", "monitor");
  var tblBody = document.createElement("tbody");

  var celdas_rellenadas = 0;
  var lado = Math.sqrt(cantidad_palabras);

  for (var f = 0; f < lado; f++) {
    var hilera = document.createElement("tr");

    for (var c = 0; c < lado; c++) {
      var celda = document.createElement("td");

      var codigo_caracter_actual = "";
      var esVacio = false;

      for (var k = 0; k < tamanio_palabra; k++){
        codigo_caracter_actual += dump_memoria[(celdas_rellenadas)*tamanio_palabra+k];
        if (codigo_caracter_actual[k] == "-"){
          esVacio = true;
          break;
        }
      }

      var textoCelda;
      if (esVacio){
        textoCelda = document.createTextNode("");
      } else {
        celda.style.color = COLOR_PANTALLA_OK;
        textoCelda = document.createTextNode(dame_caracter(codigo_caracter_actual));
      }

      celda.appendChild(textoCelda);
      hilera.appendChild(celda);
      celdas_rellenadas++;
    }

    tblBody.appendChild(hilera);
  }

  tabla.appendChild(tblBody);
  body.appendChild(tabla);
}


//Punto de entrada del listener de teclado: valida el largo máximo y delega en actualizar_ram_pantalla
function refrescar_ram_pantalla(){

  var campoEntrada = document.getElementById('entrada');
  var textoInsertado = campoEntrada.value;

  if (textoInsertado.length > cantidad_palabras){
    textoInsertado = textoInsertado.substring(0, cantidad_palabras);
    campoEntrada.value = textoInsertado;
  }

  actualizar_ram_pantalla(textoInsertado);
}

//Recalcula TODA la vista de RAM y Pantalla a partir del texto actual del campo de entrada.
//
//FIX: la versión anterior sólo escribía la posición correspondiente al último carácter
//tipeado, y "limpiar_memoria" tenía un error de indexado que dejaba basura en dump_memoria
//(no coincidía con lo que se veía en pantalla). Recalcular todo en cada tecla evita ese
//desincronismo y de paso permite borrar con Backspace/Delete o pegar texto sin lógica extra.
function actualizar_ram_pantalla(texto){

  var filasMemoria = document.getElementById("memoria").rows;
  var lado = Math.sqrt(cantidad_palabras);

  for (var pos = 0; pos < cantidad_palabras; pos++){

    var hayCaracter = pos < texto.length;
    var caracterActual = hayCaracter ? texto[pos] : null;
    var caracterDefinido = hayCaracter && caracter_en_diccionario(caracterActual);

    var bits;
    if (hayCaracter && caracterDefinido){
      bits = dame_codificacion(caracterActual);
    } else {
      bits = "-".repeat(tamanio_palabra);
    }

    //--- Actualizo dump_memoria y las celdas de la tabla de RAM ---
    var celdasFila = filasMemoria[pos].cells;
    for (var k = 0; k < tamanio_palabra; k++){
      dump_memoria[pos*tamanio_palabra + k] = bits[k];
      celdasFila[k+1].innerHTML = bits[k];
      celdasFila[k+1].style.fontWeight = hayCaracter ? "900" : "normal";
    }

    //Marco en blanco la dirección de memoria "activa" (donde está el cursor)
    if (pos == texto.length - 1){
      celdasFila[0].style.color = "#ffffff";
      celdasFila[0].style.fontWeight = "900";
    } else {
      celdasFila[0].style.color = "#86b96f";
      celdasFila[0].style.fontWeight = "normal";
    }

    //--- Actualizo la celda correspondiente en Pantalla (sin guiones, tipo documento) ---
    var celdaMonitor = celda_monitor(pos);
    celdaMonitor.classList.remove('cursor-activo');

    if (!hayCaracter){
      celdaMonitor.innerHTML = "";
      celdaMonitor.style.color = "";
      //El cursor parpadeante marca la próxima posición libre, como en un editor de texto
      if (pos === texto.length){
        celdaMonitor.classList.add('cursor-activo');
      }
    } else if (!caracterDefinido){
      //El caracter tipeado no tiene código binario asignado: en Pantalla se avisa
      //con "?" y en RAM queda sin patrón de bits definido ("-").
      celdaMonitor.innerHTML = caracter_indefinido;
      celdaMonitor.style.color = COLOR_PANTALLA_WARN;
    } else {
      celdaMonitor.innerHTML = caracterActual;
      celdaMonitor.style.color = COLOR_PANTALLA_OK;
    }
  }

  ver_memoria_modificada(texto.length);
  animar_viaje_del_dato(texto);
}


function limpiar_todo(){
  sonido_limpiar();
  document.getElementById('entrada').value = "";
  actualizar_ram_pantalla("");
}

//Envuelve el reload para poder reproducir el sonido antes de que la página se vaya
function reiniciar_pagina(){
  sonido_reiniciar();
  setTimeout(function(){ window.location.reload(); }, 350);
}


//////////// "VIAJE DEL DATO": Codificación -> RAM -> Pantalla ////////////

function animar_viaje_del_dato(texto){

  var longitudNueva = texto.length;

  if (longitudNueva > ultima_longitud_texto || (longitudNueva > 0 && longitudNueva == ultima_longitud_texto)){
    animar_escritura(longitudNueva - 1, texto[longitudNueva - 1]);
  } else if (longitudNueva < ultima_longitud_texto){
    animar_borrado(longitudNueva);
  }

  ultima_longitud_texto = longitudNueva;
}

//Resalta, en simultáneo, la fila de la tabla de codificación, la fila de RAM,
//la celda de Pantalla y las trazas que conectan los tres paneles.
function animar_escritura(pos, caracter){

  var caracterDefinido = caracter_en_diccionario(caracter);
  var clase = caracterDefinido ? 'viaje-ok' : 'viaje-warn';

  if (caracterDefinido){
    var indice = indice_de_caracter(caracter);
    var campoCodificacion = document.getElementById("codificacion"+indice);
    if (campoCodificacion){
      resaltar_fila(campoCodificacion.closest("tr"), clase);
    }
  }

  resaltar_fila(document.getElementById("fila"+pos), clase);
  resaltar_celda(celda_monitor(pos), clase);
  resaltar_celda(document.getElementById("pulso1"), clase);
  resaltar_celda(document.getElementById("pulso2"), clase);

  sonido_electrico(caracterDefinido);
}

//Resalta, en gris, la fila de RAM y la celda de Pantalla que se acaban de vaciar
function animar_borrado(pos){
  resaltar_fila(document.getElementById("fila"+pos), 'viaje-clear');
  resaltar_celda(celda_monitor(pos), 'viaje-clear');
}

function celda_monitor(pos){
  var lado = Math.sqrt(cantidad_palabras);
  var fila = Math.floor(pos / lado);
  var columna = pos % lado;
  return document.getElementById("monitor").rows[fila].cells[columna];
}

//Aplica la animación a todas las celdas de una fila de tabla
function resaltar_fila(tr, clase){
  if (!tr){
    return;
  }
  for (var i = 0; i < tr.cells.length; i++){
    resaltar_celda(tr.cells[i], clase);
  }
}

//Dispara (o re-dispara) una animación CSS sobre un elemento
function resaltar_celda(elemento, clase){
  if (!elemento){
    return;
  }
  elemento.classList.remove('viaje-ok', 'viaje-warn', 'viaje-clear');
  void elemento.offsetWidth; //fuerza reflow para poder re-disparar la animación
  elemento.classList.add(clase);
}


//////////// TECLADO GRÁFICO ////////////

//Prende o apaga (según prendida=true/false) la tecla del teclado gráfico que
//corresponde al caracter dado, si existe entre nuestras teclas definidas.
function tecla_virtual(caracter){
  if (caracter === null || caracter === undefined){
    return null;
  }
  var selector = '#teclado_virtual .tecla[data-char="' + caracter + '"]';
  return document.querySelector(selector);
}

function manejar_tecla_presionada(e){

  if (e.key === 'Backspace' || e.key === 'Delete'){
    sonido_tecla();
    return;
  }

  var caracter = (e.key && e.key.length === 1) ? e.key.toLowerCase() : null;
  var tecla = tecla_virtual(caracter);
  if (!tecla){
    return;
  }

  var ok = caracter_en_diccionario(caracter);
  tecla.classList.add('tecla-presionada', ok ? 'tecla-ok' : 'tecla-warn');
  sonido_tecla();
}

function manejar_tecla_soltada(e){
  var caracter = (e.key && e.key.length === 1) ? e.key.toLowerCase() : null;
  var tecla = tecla_virtual(caracter);
  if (!tecla){
    return;
  }
  tecla.classList.remove('tecla-presionada', 'tecla-ok', 'tecla-warn');
}

//Atenúa las teclas cuyo caracter todavía no tiene un código asignado
//en la codificación actual (útil, por ejemplo, con 2 bits: sólo a,b,c,d activas)
function actualizar_estado_teclado_virtual(){
  var teclas = document.querySelectorAll('#teclado_virtual .tecla');
  teclas.forEach(function(tecla){
    var caracter = tecla.getAttribute('data-char');
    if (caracter_en_diccionario(caracter)){
      tecla.classList.remove('tecla-sin-codigo');
    } else {
      tecla.classList.add('tecla-sin-codigo');
    }
  });
}


///// EXPORTAR
const estado_texto = {
  tamanio_palabra : 0,
  codificacion : {},
  memoria : []
};

//Genera json a partir de los datos actuales
function exportar_json(){

  const exportObj = Object.create(estado_texto);
  exportObj.tamanio_palabra = tamanio_palabra;
  exportObj.memoria = dump_memoria;
  var exportName = "output";
  downloadObjectAsJson(exportObj, exportName);
}

function downloadObjectAsJson(exportObj, exportName){
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

//////IMPORTAR

function cargar_desde_json() {

  var files = document.getElementById('selectFiles').files;
  if (files.length <= 0) {
    return false;
  }

  var fr = new FileReader();

  fr.onload = function(e) {
    var result = JSON.parse(e.target.result);

    if (result.hasOwnProperty('tamanio_palabra')){
      tamanio_palabra = result.tamanio_palabra;
    } else {
      tamanio_palabra = 2;
    }

    if (result.hasOwnProperty('memoria')){
      dump_memoria = result.memoria;
    }

    if (result.hasOwnProperty('codificacion')){
      diccionario_codificacion = result.codificacion;
    } else {
      diccionario_codificacion = definir_codificacion(tamanio_palabra, caracteres_ordenados);
    }

    ultima_longitud_texto = 0;
    generar_instancia_desde_archivo();
  };
  fr.readAsText(files.item(0));
}


///FUNCIONES AUXILIARES

//Devuelve el índice (posición en la tabla de codificación) de un caracter, o -1 si no está
function indice_de_caracter(caracter){
  for (var i = 0; i < Object.keys(diccionario_codificacion).length; i++){
    if (diccionario_codificacion[i] == caracter){
      return i;
    }
  }
  return -1;
}

//Devuelve true si el caracter está definido en el diccionario
function caracter_en_diccionario(caracter){
  return indice_de_caracter(caracter) !== -1;
}

//Con el codigo binario, obtengo el caracter
function dame_caracter(codigo_caracter_actual){

  var caracter = " ";

  if (codigo_caracter_actual[0] == "-"){
    caracter = "-";
  } else {
    var i = parseInt(codigo_caracter_actual, 2);
    caracter = diccionario_codificacion[i];
  }

  return caracter;
}

//Dado un caracter, me devuelve su codificacion binaria con cantidad de bits tamanio_palabra.
//Si el caracter no está en el diccionario, devuelve guiones (se recomienda chequear antes
//con caracter_en_diccionario, que es lo que hace actualizar_ram_pantalla).
function dame_codificacion(caracter){
  var indice = indice_de_caracter(caracter);
  if (indice === -1){
    return "-".repeat(tamanio_palabra);
  }
  return createBinaryString(indice, tamanio_palabra);
}


//Si la posición de memoria no está en la pantalla, scrolleo el frame para ver el cambio.
//Para no marear, lo hago en "páginas" dependiendo de la cantidad que entran en pantalla.
//Esto "aplasta" los números a 0,8,16,24,etc
function ver_memoria_modificada(cantidad_caracteres_actual){

  if (cantidad_caracteres_actual <= cantidad_por_pantalla){
    desplazar_frame_memoria("fila0");
  } else {
    var fila_para_centrar = (Math.floor((cantidad_caracteres_actual-1) / cantidad_por_pantalla))*cantidad_por_pantalla;
    desplazar_frame_memoria("fila"+fila_para_centrar);
  }
}

//Desplaza el scroll INTERNO del panel de RAM (frame_mem) para mostrar la fila indicada,
//escribiendo scrollTop directamente en vez de usar scrollIntoView().
//FIX: scrollIntoView() puede "burbujear" y mover el scroll de toda la página (no sólo el
//del recuadro de RAM) cuando el elemento no entra cómodo en el viewport. Esto hacía que la
//página saltara hacia abajo con cada tecla y al Limpiar. Calculando la posición a mano y
//asignando sólo contenedor.scrollTop, el scroll de la página nunca se toca.
function desplazar_frame_memoria(idFila){
  var contenedor = document.getElementById("frame_mem");
  var fila = document.getElementById(idFila);
  if (!contenedor || !fila){
    return;
  }
  var contenedorRect = contenedor.getBoundingClientRect();
  var filaRect = fila.getBoundingClientRect();
  contenedor.scrollTop += (filaRect.top - contenedorRect.top);
}


//Convierte de decimal a binario, hasta 32 bits
function createBinaryString(nMask, tamanio_palabra) {
  var sMask = "";
  for (var nFlag = 0, nShifted = nMask; nFlag < 32; nFlag++, sMask += String(nShifted >>> 31), nShifted <<= 1);
  //Recorto el substring con la cantidad de finales que necesito
  return sMask.substring(32-tamanio_palabra);
}


//////////// SONIDOS (sintetizados con Web Audio API, sin archivos externos) ////////////

var sonido_activado = true;
var contexto_audio = null;

function alternar_sonido(){
  sonido_activado = !sonido_activado;
  document.getElementById('boton_sonido').textContent = sonido_activado ? '🔊 Sonido' : '🔇 Sonido';
}

function obtener_contexto_audio(){
  if (!contexto_audio){
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    contexto_audio = new AudioContextClass();
  }
  //Los navegadores exigen una interacción del usuario antes de reproducir sonido.
  //Como esto siempre se llama desde un manejador de click/teclado, ya se cumple.
  if (contexto_audio.state === 'suspended'){
    contexto_audio.resume();
  }
  return contexto_audio;
}

//Tono simple: útil como bloque para armar el resto de los sonidos
function tono(frecuencia, duracionMs, tipoOnda, volumen){
  var ctx = obtener_contexto_audio();
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = tipoOnda || 'square';
  osc.frequency.setValueAtTime(frecuencia, ctx.currentTime);
  gain.gain.setValueAtTime(volumen || 0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracionMs/1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duracionMs/1000);
}

//Click seco de tecla mecánica (ruido blanco corto con decaimiento)
function sonido_tecla(){
  if (!sonido_activado){
    return;
  }
  var ctx = obtener_contexto_audio();
  var duracion = 0.02;
  var bufferSize = Math.floor(ctx.sampleRate * duracion);
  var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  var datos = buffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++){
    datos[i] = (Math.random()*2 - 1) * (1 - i/bufferSize);
  }
  var fuente = ctx.createBufferSource();
  fuente.buffer = buffer;
  var gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  fuente.connect(gain);
  gain.connect(ctx.destination);
  fuente.start();
}

//Zumbido eléctrico breve: acompaña el "viaje del dato" por las trazas.
//Distinta altura según si el caracter tiene código asignado o no.
function sonido_electrico(caracterDefinido){
  if (!sonido_activado){
    return;
  }
  tono(caracterDefinido ? 900 : 260, 90, 'sawtooth', 0.045);
}

//Dos tonos ascendentes: "encendido"
function sonido_generar(){
  if (!sonido_activado){
    return;
  }
  tono(440, 90, 'square', 0.06);
  setTimeout(function(){ tono(880, 140, 'square', 0.06); }, 90);
}

//Barrido descendente: "swipe" de limpieza
function sonido_limpiar(){
  if (!sonido_activado){
    return;
  }
  var ctx = obtener_contexto_audio();
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

//Dos tonos descendentes: "apagado"
function sonido_reiniciar(){
  if (!sonido_activado){
    return;
  }
  tono(880, 90, 'square', 0.06);
  setTimeout(function(){ tono(440, 160, 'square', 0.06); }, 90);
}
