// --- 1. CONEXIÓN CON HTML ---
const inputB = document.getElementById('b');
const inputH = document.getElementById('h');
const inputFc = document.getElementById('fc');
const inputFy = document.getElementById('fy');
const inputRec = document.getElementById('rec');
const inputAsSup = document.getElementById('as_sup');
const inputAsInf = document.getElementById('as_inf');
const boton = document.getElementById('botonCalcular');
const ctx = document.getElementById('diagramaMN').getContext('2d');

// Variable global para guardar nuestro gráfico
let myChart;

// --- CONSTANTES ---
const Es = 200000; // Módulo de elasticidad del acero (MPa)
const epsilon_c_max = 0.003; // Deformación máxima del hormigón

// --- 2. FUNCIONES DE CÁLCULO DE PUNTOS ---

/**
 * Calcula el punto de Compresión Pura (Punto A del diagrama M-N)
 * Asume que toda la sección está en compresión uniforme y el acero fluye.
 * @param {number} b_mm - Ancho de la sección (mm)
 * @param {number} h_mm - Altura de la sección (mm)
 * @param {number} fc - Resistencia del hormigón (MPa)
 * @param {number} fy - Fluencia del acero (MPa)
 * @param {number} Ast_mm2 - Área total de acero (mm²)
 * @returns {object} { M: 0, P: phiPn } (Momento en N-mm, Carga Axial en N)
 */
function calcularCompresionPura(b_mm, h_mm, fc, fy, Ast_mm2) {
    const Ag_mm2 = b_mm * h_mm;
    // Pn = Fuerza en Hormigón + Fuerza en Acero
    // Pn = 0.85 * f'c * (Ag - Ast) + fy * Ast
    const Pn = 0.85 * fc * (Ag_mm2 - Ast_mm2) + fy * Ast_mm2; // Resultado en N

    // Factor de reducción phi para compresión controlada (columna con estribos)
    const phi = 0.65; 

    return { M: 0, P: phi * Pn }; // M=0 por definición, P en N
}

/**
 * Calcula el punto de Tensión Pura (Punto E del diagrama M-N)
 * Asume que toda la sección está en tensión, ignora el hormigón, y el acero fluye.
 * @param {number} fy - Fluencia del acero (MPa)
 * @param {number} Ast_mm2 - Área total de acero (mm²)
 * @returns {object} { M: 0, P: phiPn } (Momento en N-mm, Carga Axial en N)
 */
function calcularTensionPura(fy, Ast_mm2) {
    // Pn = - fy * Ast (Negativo porque es tensión)
    const Pn = -fy * Ast_mm2; // Resultado en N

    // Factor de reducción phi para tensión controlada
    const phi = 0.90;

    return { M: 0, P: phi * Pn }; // M=0 por definición, P en N (negativo)
}

// --- 3. FUNCIÓN PRINCIPAL ---
boton.addEventListener('click', calcularDiagrama);

function calcularDiagrama() {
    // --- 3a. OBTENER Y CONVERTIR VALORES DE ENTRADA ---
    // Obtenemos valores en cm y cm², convertimos a mm y mm² para cálculos internos
    const b_cm = parseFloat(inputB.value);
    const h_cm = parseFloat(inputH.value);
    const fc = parseFloat(inputFc.value); // MPa (N/mm²)
    const fy = parseFloat(inputFy.value); // MPa (N/mm²)
    const rec_cm = parseFloat(inputRec.value);
    const as_sup_cm2 = parseFloat(inputAsSup.value);
    const as_inf_cm2 = parseFloat(inputAsInf.value);

    // Conversión a mm y mm²
    const b_mm = b_cm * 10;
    const h_mm = h_cm * 10;
    const rec_mm = rec_cm * 10;
    const as_sup_mm2 = as_sup_cm2 * 100;
    const as_inf_mm2 = as_inf_cm2 * 100;
    const Ast_mm2 = as_sup_mm2 + as_inf_mm2; // Área total de acero

    // Validar entradas (simple chequeo si son números)
    if (isNaN(b_mm) || isNaN(h_mm) || isNaN(fc) || isNaN(fy) || isNaN(rec_mm) || isNaN(as_sup_mm2) || isNaN(as_inf_mm2)) {
        alert("Por favor, ingrese valores numéricos válidos en todos los campos.");
        return;
    }

    // --- 3b. CÁLCULO DE PUNTOS CLAVE ---
    const puntoA = calcularCompresionPura(b_mm, h_mm, fc, fy, Ast_mm2); // { M: 0, P: phiPn en N }
    const puntoE = calcularTensionPura(fy, Ast_mm2);                     // { M: 0, P: phiPn en N }

    // Por ahora, solo tenemos estos dos puntos. Más adelante añadiremos los intermedios.
    // Necesitamos al menos 3 puntos para que Chart.js dibuje una línea. Agreguemos un punto dummy por ahora.
    // ¡ESTE PUNTO DUMMY DEBE SER REEMPLAZADO POR CÁLCULOS REALES!
    const puntoDummyC = { M: 150 * 1e6, P: 200 * 1e3 }; // M en N-mm, P en N (Valores inventados!)

    const puntos = [
        puntoA, 
        puntoDummyC, // Reemplazar más tarde!
        puntoE
    ];

    // Ordenar puntos por carga P (de mayor a menor) para un gráfico más coherente
    puntos.sort((a, b) => b.P - a.P); 

    // --- 3c. PREPARAR DATOS PARA EL GRÁFICO ---
    // Convertimos de N y N-mm a kN y kNm para el gráfico
    const datosGrafico = puntos.map(punto => ({ 
        x: punto.M / 1e6, // N-mm a kNm
        y: punto.P / 1e3  // N a kN
    }));

    // --- 3d. LLAMAR A LA FUNCIÓN DE DIBUJO ---
    dibujarGrafico(datosGrafico);
}

// --- 4. FUNCIÓN DE DIBUJO (CHART.JS) ---
function dibujarGrafico(data) {
    // Si ya existe un gráfico, lo destruimos antes de dibujar el nuevo
    if (myChart) {
        myChart.destroy();
    }

    // Creamos el nuevo gráfico
    myChart = new Chart(ctx, {
        type: 'scatter', // Tipo de gráfico: dispersión
        data: {
            datasets: [{
                label: 'Diagrama φMn - φPn',
                data: data,
                borderColor: 'red',
                backgroundColor: 'red',
                showLine: true, // ¡Queremos que una los puntos!
                fill: false,
                tension: 0.1 // Suaviza un poco la línea
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Permite ajustar el tamaño mejor
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Momento (φMn) [kNm]'
                    },
                    // Empezar el eje X en 0
                    min: 0 
                },
                y: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Carga Axial (φPn) [kN]'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Diagrama de Interacción Nominal φMn - φPn'
                }
            }
        }
    });
}