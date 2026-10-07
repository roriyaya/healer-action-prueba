function saludar(nombre: string): string {
  return "Hola, " + nombre.toUpperCase();
}

// Error a proposito: saludar() devuelve un string, no un number.
const resultado: number = saludar("Roberto");

console.log(resultado);
