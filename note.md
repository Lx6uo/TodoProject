# 1. 能力边界

网页：PC / H5，HTML / CSS / JS，Vue / React

小程序：微信、支付宝 ...

移动 APP：React Native、Weex、NativeScript、Uni APP、Taro

桌面端：VSCode（Electron）

后端：Node.js（Koa、Express、Nest.js）

全栈：Next.js

游戏 / 3D：canvas、three.js

AI：Langchain ...

# 2. HTML5 相关知识

插件：Emmet 插件语法（`ul>li{$}*20`）、Live Server、ES7+ React/Redux/React-Native snippets

HTML（超文本标记语言）：骨架，CSS（层叠样式表）：化妆打扮，JS（脚本语言）：行为，逻辑

## 标签划分

单标签（img、input）和双标签（div、p）

---

行内，特点：一行可以放多个，设置宽高无效，例如 span、strong、em、i

块，特点：独占一行，可以直接设置宽高，div、p

行内块：一样可以放多个，同时又能设置宽高，img、input

---

语义化目的：见名知意，SEO 友好，常见语义化标签：header、nav、aside、main、article、footer

---

和后端交互的标签：form、input、select、textarea

# 3. CSS3 的核心知识

## 样式重置或统一

写样式之前：一般要做样式统一或重置。

```css
* {
  margin: 0;
  padding: 0;
}
```

normalize.css: https://github.com/necolas/normalize.css

```css
选择器 {
  属性名：属性值；
}
ul {
  background-color: teal;
}
```

选择器（描述的越**精细**优先级就越高）：`!important` > id > style > class > 标签 > *

## 原子化 CSS

**原子化 CSS**：Tailwind CSS、Uno CSS，用好它需要了解 CSS 基础和原理。

## 如何查看兼容性

前端兼容性：https://caniuse.com/

## <font color=e32d40>**关于布局的演化**</font>

定位贯穿始终：Table  > 浮动（float）> **弹性（flex）**> 网格（grid）

语法：https://www.ruanyifeng.com/blog/2015/07/flex-grammar.html

实践：https://www.ruanyifeng.com/blog/2015/07/flex-examples.html

## CSS 两种动画形式

CSS 过渡：transition，CSS 动画：animation

## 了解响应式和移动端网页开发

响应式开发（一套代码适配 PC 和移动，不同设备宽度下设置不同的样式达到不同的效果）：**媒体查询**

纯移动端网页开发：%，rem、vw，如何开发一个移动端网页(多端兼容)。

## CSS 预处理器

CSS 预处理器（内置了更多的能力，例如循环、函数等，最终还要转成 CSS 使用）：Less、Sass

# 4. JavaScript 核心

## 基础

组成：ECMAScript（标准）、DOM（文档对象模型）、BOM（浏览器对象模型）

ES6 / ESNext：2015 年 6 月之后的版本。

数据类型：简单数据类型（number、string、boolean、null、undefined、bigint、symbol），复杂（函数、对象、数组、正则...）

## 优先用 const

**常量**：简单数据类型，直接不能改，复杂数组类型，引用地址不能改，内容可以改。

```js
const foo = () => {}

const age = 18
age = 19 // x

const arr = []
arr.push(8) // ok

arr = [8] // x，改的是引用
```

## 关于函数传参

```js
let a = 8
function foo(a) {
	// 行参也是一种局部变量
	a = 9
}
foo(a)
console.log(a) // 8


let arr = [8]
function bar(arr) {
	// 函数传参，如果传递的是一个复杂数据类型，传递是一个地址
	// 对内容的修改，会影响外部
	arr.push(9)
}
bar(arr)
console.log(arr) // [8, 9]


let xxx = [8]
function test(xxx) {
	// 函数传参，如果传递的是一个复杂数据类型，传递是一个地址
	// 对内容的修改，会影响外部
	xxx = [8, 9]
}
test(xxx)
console.log(xxx) // [8]
```

## 闭包

概念：一个函数中访问了外部函数中的局部变量，我们就成为访问变量的地方发生了闭包现象，变量定义所在的函数称为闭包函数。

#### 1. 判断以下函数有闭包吗？

```js
let a =1
function foo() {
  console.log(a);
  debugger
}
foo();
```



```js
(function foo() {
  let a = 1;
  function foo() {
    console.log(a);
    debugger;
  }
  foo();
})();
```

#### 2. **注意：切勿滥用** 闭包会造成内存浪费！

```js
function foo() {
  let a = 1
  return function() {
    a ++
  }
}
const t = foo()
t()
t()
t()
```

#### 3. 注意死循环！

```js
const o = {
  age: 18
}

Object.defineProperty(o, 'age', {
  get() {
    console.log('操作 DOM')
    return o.age
  },
  set(newValue) {
    o.age = newValue
  }
})
o.age
```

解决：拷贝（内存占用），引申概念：**零拷贝**

```js
const o = {
  age: 18
}

const copyO = { ...o }

Object.defineProperty(o, 'age', {
  get() {
    console.log('劫持到了数据获取的操作')
    return copyO.age
  },
  set(newValue) {
    copyO.age = newValue
  }
})
o.age
o.age = 19
console.log(o.age)
```

闭包解决

```js
const o = {
  age: 18,
  name: "韵铭"
};

init(o);

function init(o) {
  Object.keys(o).forEach((key) => {
    reactive(o, key, o[key]);
  });
}

function reactive(obj, key, value) {
  Object.defineProperty(obj, key, {
    get() {
      console.log("劫持到了数据获取的操作");
      return value;
    },
    set(newValue) {
      value = newValue;
    },
  });
}

o.age
o.age = 19
console.log(o.age)
```

## this

#### 1. 函数中的 this 谁调用就是谁

```js
// 'use strict'
function foo() {
  console.log(this) // window
}
foo() // window.foo()
```

举个例子

```js
// 不要用 var，我这儿只是举例
var age = 18 // window.age = 18
const o = {
  age: 19,
  foo() {
    console.log(this.age)
  }
}
o.foo() // this => o，19

var temp = o.foo
temp() // window.temp() this => window，18
```

*事件绑定

```js
oBtn.onclick = function () {
  // this => oBtn
  this.style.backgroundColor = "red";
};
```

#### 2. 定时中的 this 就是 window

```js
setTimeout(function() {
  console.log(this) // window
}, 1000)
```

#### 3. 箭头函数中的 this 在定义的时候就已经决定了，没有 this，取决于外部环境

```js
const o = {
  age: 19,
  foo() {
    return () => {
      // 这里的 this 取决于外部 foo 函数中的 this 是谁它就是谁
      console.log(this.age)
    }
  }
}
```

#### 4. 构造函数中的 this 就是实例对象

一个函数是不是构造函数，取决于怎么调用，如果通过 new 调用的，那么就是构造函数！

```js
// const o1 = {}
// const o2 = new Object()

function Person(name, age) {
  // this => p1
  this.name = name
  this.age = age
}
const p1 = new Person("ifer", 18)
console.log(p1)
```

### 改变 this 指向

call（直接调用函数，传递任意多个参数） / apply（直接调用函数，传递两个参数） / bind（返回新函数）

```js
const o = {}
oBtn.onclick = function () {
  // 一点击按钮就给 o 添加了一个属性 age
  this.age = 18  
}.bind(o);
```



```js
const arr = [1, 2, 3, 4, 5];
console.log.apply(console, arr);

// 找数组中的最大值
console.log(Math.max(1, 2, 3, 9, 4, 5))
const arr = [1, 2, 3, 9, 4, 5];

console.log(Math.max.apply(Math, arr));
console.log(Math.max(...arr));
```

## 了解构造函数继承和 extends

组合继承 = 盗用构造函数继承 + 原型继承

```js
function Person(name, age) {
  this.name = name;
  this.age = age;
}

Person.prototype.say = function() {
  console.log('say')
}

function Star(name, age, salary) {
  // this => wsc
  // #1 盗用构造函数继承（继承的是属性）
  // Person.call(this, name, age)
  Person.apply(this, [name, age])
  this.salary = salary;
}

// #2 原型继承（继承的是方法）
Star.prototype = new Person()
// 为什么要这样写？
Star.prototype.constructor = Star

// #3 组合继承 = 盗用构造函数继承 + 原型继承
const wsc = new Star('ifer', 18, 10000)
wsc.say()
```

ES6 class 集成

```js
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  say() {
    console.log('say')
  }
}

class Star extends Person {}

const wsc = new Star('ifer', 18)
wsc.say()
```

## 关于原型链

问题

```js
function Person(name, age) {
  this.name = name;
  this.age = age;
  this.say = function() {
    console.log('say')
  }
}

const p1 = new Person('ifer', 18)
p1.say()

const p2 = new Person('elser', 19)
p2.say()

console.log(p1.say === p2.say) // false，内存浪费
```

原型链：多个对象通过 `__proto__` 链接起来的这种关系就是原型链！

```js
function Person(name, age) {
  this.name = name;
  this.age = age;
}

Object.prototype.say = function() {
  console.log('say')
}
// 方法挂到原型上面，节省内存
/* Person.prototype.say = function() {
  console.log('say')
} */

const p1 = new Person('ifer', 18)
p1.say()


// 1. 是对象就有 __proto__ 属性，指向（等于）构造函数的原型
// 2. 查找：p1 找 say，发现自己没有，会顺着 __proto__ 找，找到 Person.prototype 的 say
console.log(p1.__proto__ === Person.prototype) // true
console.log(Person.prototype.__proto__ === Object.prototype) // true
console.log(p1.__proto__.__proto__ === Object.prototype) // true
console.log(Object.prototype.__proto__ === null) // true
```

有啥用？

```js
Object.prototype.version = '1.0.0'
// Array.prototype.push = function() {}
// const arr = new Array()
const arr = []
// arr 实例没有 push 方法，会顺着 __proto__ 找，找到 Array.prototype 的 push
console.log(arr.__proto__ === Array.prototype) // true
arr.push(8)
console.log(arr.version)
```

![WechatIMG114.jpeg](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d9afcd1172d340508d25c095b1103fac~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp?)

## 执行机制 / Event loop / 事件循环 / 事件环

1\. JS 是单线程的，代码的执行分为同步代码和异步代码

2\. 当碰到同步代码的时候直接在执行栈中执行

3\. 当碰到异步代码并且时机成熟的时候（例如定时器时间到了），就把异步代码放到任务队列当中

4\. <font color=e32d40>**当执行栈中的同步代码执行完毕后**</font>

5\. 就去任务队列中把异步代码取出来放到执行栈中执行，这种反复去任务队列中取异步代码并放到执行栈中执行的操作就是事件循环！

```js
console.log(1)
setTimeout(() => {
  console.log(3)
}, 1000)
console.log(2)
```



```js
// 这个 3 一定是 1s 准时打印吗？
setTimeout(() => {
  console.log(3)
}, 1000)
// 不一定：取决于执行栈中同步代码执行的时间有没有超过 1s
// ...
```



## 异步处理发展的几个阶段

```js
const sum = (a, b) => {
  // ...
  console.log(1)
  setTimeout(() => {
    return a + b
  }, 1000)
  // ...
}
const result = sum(1, 1)
console.log(result) // undefined
```

回调

```js
const sum = (a, b, callback) => {
  setTimeout(() => {
    callback(a + b);
  }, 1000);
};
sum(1, 1, function (result) {
  console.log(result);
});
```

回调函数问题：回调地狱

```js
const sum = (a, b, callback) => {
  setTimeout(() => {
    callback(a + b);
  }, 1000);
};
sum(1, 1, function (result) {
  // 后面的处理需要依赖上一步的结果
  sum(result, 3, function (result) {
    sum(result, 4, function (result) {
      console.log(result);
    });
  });
});
```

Promise：解决回调地狱的问题

```js
const sum = (a, b, callback) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(a + b);
    }, 1000);
  });
};

sum(1, 1).then((result) => {
  return sum(result, 3);
}).then((result) => {
  return sum(result, 4);
}).then((result) => {
  console.log(result);
});
```

Promise 问题：虽然解决了回调地域，并不能简化代码，所以用 async/await

```js
const sum = (a, b, callback) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(a + b);
    }, 1000);
  });
};

async function calc() {
  const r = await sum(1, 1)
  const r2 = await sum(r, 3)
  const r3 = await sum(r2, 4)
  console.log(r3)
}
calc()
```

静态方法：Promise.all()、Promise.race()、Promise.allSettled()

# 5. Web APIs

## DOM 增删改查

增

```js
const oDiv = document.createElement('div')
// 父元素.appendChild(子元素)
document.body.appendChild(oDiv)
```

删

```js
// 自“杀”
oBtn.remove()
// 他“杀”
document.body.removeChild(oBtn)
```

改

```html
<button>add</button>
<script>
  const oBtn = document.querySelector("button");
  const oH1 = document.createElement("h1");
  oH1.innerHTML = oBtn.innerHTML;
  document.body.replaceChild(oH1, oBtn);
</script>
```

查

```js
document.querySelector()
document.querySelectorAll()
```

## 关于事件操作

开关（事件源）被按下（事件类型）灯亮了（事件处理程序）

```html
<button>add</button>
<script>
// 需求：点按钮加一个 div
// 匈牙利命名法简版：类型 + 含义
// o => object
// iAge => interge
// nAge => number
// aNames => array
const oBtn = document.querySelector('button');
// 事件源.事件类型 = 事件处理函数（做各种事情）
// oBtn.onclick = function() {}
// 后面会覆盖前面的
// oBtn.onclick = function() {}

oBtn.addEventListener('click', function() {
  const oDiv = document.createElement('div')
  oDiv.innerHTML = "Hello"
  document.body.appendChild(oDiv)
});
</script>
```



```js
// 等文档结构加载完毕触发
document.documentElement.addEventListener("DOMContentLoaded", function() {
  // ...
})
// 等所有资源（DOM、图片、视频）加载完毕后触发
window.onload = function() { //... }
```

### 事件流

目标、冒泡（从内到外）、捕获（从外到内）

```js
// 如何控制是冒泡还是捕获
// 可以通过第三个参数来控制是冒泡还是捕获，默认是冒泡
oBtn.addEventListener("click", function() {}, false)
```

### 事件委托

问题：性能低；事件绑定的效果对后续新增的元素无效。

```html
<ul>
  <li>1</li>
  <li>2</li>
  <li>3</li>
  <li>4</li>
  <li>5</li>
</ul>
<button id="oBtn">add</button>
<script>
  const aLi = document.querySelectorAll("li");
  for (let i = 0; i < aLi.length; i++) {
    aLi[i].onclick = function () {
      this.style.backgroundColor = "red";
    };
  }

  const oUl = document.querySelector("ul");
  oBtn.onclick = function() {
    const oLi = document.createElement("li");
    oLi.innerHTML = "new";
    oUl.appendChild(oLi);
  }
</script>
```

解决：事件委托

是什么：把平常给每一个元素绑定事件的操作统一绑定到祖先元素身上。

原理：冒泡

好处是什么：性能高；对后续新增的元素同样具有事件绑定的效果。

```html
<ul>
  <li>1</li>
  <li>2</li>
  <li>3</li>
  <li>4</li>
  <li>5</li>
  <li>6</li>
  <li>7</li>
  <li>8</li>
  <li>9</li>
  <li>10</li>
  <li>11</li>
  <li>12</li>
  <li>13</li>
  <li>14</li>
  <li>15</li>
  <li>16</li>
  <li>17</li>
  <li>18</li>
  <li>19</li>
  <li>20</li>
</ul>
<button id="oBtn">add</button>
<script>
  const oUl = document.querySelector("ul");
  oUl.addEventListener("click", function (e) {
    // e => event
    // e => 事件对象 => 和事件相关的一系列方法和属性的集合
    // e.target => 触发事件的那个元素（点谁就是谁）
    e.target.tagName === "LI" && (e.target.style.backgroundColor = "red");
  });
  oBtn.addEventListener("click", function () {
    const oLi = document.createElement("li");
    oLi.innerHTML = "new";
    oUl.appendChild(oLi);
  });
</script>
```

如何阻止冒泡

```js
e.stopPropagation();
```

### 默认事件

```html
<a href="https://www.wps.cn">wps</a>
<script>
  const oA = document.querySelector("a");
  oA.addEventListener("click", function (e) {
    e.preventDefault();
    // 做一些其他操作
    // ...
    location.href = "https://www.wps.com";
  });
</script>
```

## 关于重绘回流

重绘：和外观相关的变化会触发重绘（颜色、背景、透明度、阴影）。

回流：和几何属性相关的变化会触发回流（宽、高、位置变化），回流一定会触发重绘。

```js
oDiv.style.width = '100px';
oDiv.style.height = '200px';
oDiv.style.backgroundColor = 'teal'


.active {
  width: 100px;
  height: 200px;
  background-color: teal;
}
oDiv.className = 'active'
```

## 本地存储

localStorage / sessionStorage / cookie（能存的东西很少，4kb，条件符合的情况下会随着请求头带到后端，可以设置过期时间，生效范围等） / IndexedDB

```js
// 增加
localStorage.setItem("name", "韵铭")
// 删
localStorage.removeItem
// 改
localStorage.setItem("name", "蔡库")
// 查
localStorage.getItem("name")
```

## 节流防抖

节流：持续触发也执行，只不过执行的频率变低了，多低呢？取决于你写的时间。

```js
document.body.addEventListener(
  "mousemove",
  _.throttle(function (e) {
    console.log("body click");
  }, 1000)
);
```

防抖：持续触发不执行，不触发的一段时间后才执行。

```html
<script src="./node_modules/lodash/lodash.min.js"></script>
<script>
  document.body.addEventListener(
    "mousemove",
    _.debounce(function (e) {
      console.log("body click");
    }, 1000)
  );
</script>
```

# 6. AJAX & Fetch

跨域：浏览器处于安全性的考虑而做出的同源策略的限制（域名、协议、端口号任一不一样就是跨域）。

<font color=e32d40>No 'Access-Control-Allow-Origin' header is present on the requested</font>

解决：后端（通过设置 Access-Control-Allow-Origin 来运行某些域名访问）；**代理服务器**。

XMLHttpRequest

```js
const xhr = new XMLHttpRequest()
xhr.open("GET", "https://www.wps.cn/ping")
xhr.send()
xhr.onload = function() {
  console.log(xhr.responseText)
}
```

fetch

```js
fetch("https://www.wps.cn/ping").then(r => r.text()).then(console.log)

async function f() {
  const r = await fetch("https://www.wps.cn/ping")
  const data = await r.text()
  console.log(data)
}
f()
```

axios：工作中

# 7. 模块化方案/规则

规定了以怎样的方式让模块间产生联系。

1\. 淘汰：AMD（require.js）、CMD（sea.js）

2\. CommonJS（Node.js 默认）

sum.js

```js
const sum = (a, b ) => a + b
module.exports = {
  sum
}
```

index.js

```js
const sumMod = require('./sum.js')
sumMod.sum(1, 2)
```

3\. ESM（ECMAScript Module，大一统的模块化方案）

sum.js

```js
// 按需导出
export const sum = (a, b) => a + b
export const decrease = (a, b) => a - b
// 默认导出，一个文件只能有一个
export default function xxx() {
  return 'xxx'
}
```

main.js

```js
import { sum, decrease as d }, xxx from './sum.js'

sum(1, 2)
d(2, 1)
```

# 8. Node.js

是什么：基于 Chrome V8 引擎的运行环境（软件）。

JavaScript（ECMAScript + DOM + BOM 浏览器 API）

Node.js（ECMAScript + 相关 API）

## [NVM](https://github.com/coreybutler/nvm-windows/releases) / [n](https://www.npmjs.com/package/n)

Node 版本管理管理工具。

```js
nvm list available # 总共有哪些可以装
nvm install 22.18.0
nvm use 22.18.0
nvm ls # 本地下载的有哪些
```

## NPM / PNPM / Yarn

包管理工具（不需要安装，安装了 Node 自带的有），对应的还有包管理平台：https://www.npmjs.com/。

```bash
npm i axios

# 安装所有的 package.json 里面的依赖
npm i

# npm5.2 版本之后新增的一个命令，通过它可以直接直接执行 node_modules/.bin 文件夹中的一些命令
npx
```

## NRM

源管理工具。

```
npm i -g nrm
nrm ls
nrm use taobao
npm i mime # 后续安装包就从 taobao 源下载的拉

# 一般公司也有自己的源，你可以通过下面命令添加进去，以后用到可以切换
# nrm add --help
# nrm add kingsoft 源地址
```

# 8. Webpack & Vite

Webpack 笔记下去自行查看：https://365.kdocs.cn/l/cj61scQuuiNq

```bash
npm create vite@latest
```

# 9. Vue & React

# 10. 小作业





