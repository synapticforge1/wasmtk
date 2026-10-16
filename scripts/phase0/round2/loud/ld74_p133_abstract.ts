type i32 = number; type f64 = number;
abstract class Animal {
  abstract legs(): i32;
  describe(): i32 {
    return this.legs() * 10;
  }
}
class Dog extends Animal {
  legs(): i32 {
    return 4;
  }
}
class Bird extends Animal {
  legs(): i32 {
    return 2;
  }
}
const d: Dog = new Dog();
const b: Bird = new Bird();
const r1: i32 = d.describe();
const r2: i32 = b.describe();
console.log(r1, r2);
