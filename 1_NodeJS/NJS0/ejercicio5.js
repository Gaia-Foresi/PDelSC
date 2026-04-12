function suma(a, b) {
    return a + b;
}

function resta(a, b) {
    return a - b;
}

function multiplicacion(a, b) {
    return a * b;
}

function division(a, b) {
    return a / b;
}

document.getElementById("suma").textContent = suma(5, 3);
document.getElementById("resta").textContent = resta(8, 6);
document.getElementById("multi").textContent = multiplicacion(3, 11);
document.getElementById("div").textContent = division(30, 5);