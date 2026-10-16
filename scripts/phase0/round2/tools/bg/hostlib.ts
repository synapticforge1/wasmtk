type i32 = number;
type f64 = number;

declare interface Display {
  showValue(value: i32): void;
}

declare const display: Display;

export function go(n: i32): void {
  display.showValue(n * 2);
}

export function big(): i32 {
  return -1;
}
