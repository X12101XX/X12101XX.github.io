---
title: 2026 算法方向 1 班 · 20261117 课堂练习题解
date: 2026-11-17 23:50:00
description: 阶梯电费、幸运数字、连续达标、去极值评分、地雷阵、后缀递增、同余子段七道课堂练习的思路与 AC 代码。
categories:
  - 算法
tags:
  - 题解
  - C++
---

七道课堂练习（A–G）的题目大意、主要思路与 AC 代码。
<!-- more -->

## A. 阶梯电费计算

### 题目大意

题目会给出电费 $x$ 的计价规则，需要根据 $x$ 的大小与 $s$ 的值，分情况模拟电费计算。规则如下：

- $0\sim200$：谷价 $50$, 峰价 $60$
- $201\sim300$：谷价 $65$，峰价 $80$
- $500+$：谷价 $90$，峰价 $110$

### 主要思路

将情况一分为二，分为 $s = 0$ 与 $s = 1$ 的情况。然后按情况模拟

### AC 代码

```cpp
#include <bits/stdc++.h>
int main(){
    int x, s;
    std::cin >> x >> s;
    if(s == 1){
        if(x > 500){
            std::cout << (x - 500) * 110 + 300 * 80 + 200 * 60;
        } else if(x > 200){
            std::cout << (x - 200) * 80 + 200 * 60;
        } else{
            std::cout << x * 60;
        }
    } else{
        if(x > 500){
            std::cout << (x - 500) * 90 + 300 * 65 + 200 * 50;
        } else if(x > 200){
            std::cout << (x - 200) * 65 + 200 * 50;
        } else{
            std::cout << x * 50;
        }
    }
}
```

## B. 幸运数字统计

### 题目大意

给出区间 $[L, R]$ 与 正整数 $k$。幸运数字是指满足以下性质的数：

- 十进制位数字和是 $k$ 的倍数
- 十进制表示中包含至少一个 **奇数**

求 $[L, R]$ 内的正整数的幸运数字个数和最大幸运数字。

### 主要思路

对于此题目，能枚举 $[L, R]$ 内的所有数字 $x$，再使用 `while` 循环来求出任意数字 $x$ 上的每一位数，而后根据题意进行检测即可。可以使用函数使得代码逻辑更为清晰。

### AC 代码

```cpp
#include <bits/stdc++.h>

bool check(int x, int k){
    int sum = 0;
    int flag = 0;
    while( x > 0){
        sum += x % 10;
        if((x % 10) % 2 == 1){
            flag = 1;
        }
        x /= 10;
    }
    return flag && (sum % k == 0);
}

int main(){
    int l, r, k;
    std::cin >> l >> r >> k;
    int count = 0;
    int max = -1;
    for(int i = l ; i <= r; ++i){
        if(check(i, k)){
            ++count;
            max = i;
        }
    }
    std::cout << count << ' ' << max;
}
```

## C. 连续最长达标天数

### 题目大意

题目给出长度为 $n$ 的正整数序列 $a$。对于一个连续序列 $s$，若 $s$ 中每一位数都大于等于 $m$ ，称 $s$ 是达标的。要求求出：

- $a$ 中连续段有多少是达标序列
- $a$ 中达标序列的最大长度

### 主要思路

可以维护 $\text{start}$ 变量作为连续段的开始，遍历所有可能的 $\text{start}$。对于每一个大于等于 $m$ 的 $a_\text{start}$，都找到最后一个满足 $[\text{start}, \text{end}]$ 下标范围内，值都大于等于 $m$ 的 $\text{end}$， 此时便可以保证，这是其中一个要找的达标序列。

在找到 $\text{end}$ 之后，可以令 $\text{start} \leftarrow \text{end} + 1$，快速完成遍历。如果 $\text{start}$ 不满足我们想要的性质，便直接让 $\text{start} + 1$。

每次找到的连续段长度，就是 $\text{end} - \text{start} + 1$。实际实现时，可以令 $end \leftarrow \text{end} + 1$，以方便代码的编写。

### AC 代码

```cpp
#include <bits/stdc++.h>
int main(){
    int n, m;
    std::cin >> n >> m;
    std::vector<int> a(n);
    for(int i = 0; i < n; ++i){
        std::cin >> a[i];
    }

    int start = 0;

    int maxLength = 0;
    int count = 0;

    while(start < n){
        if(a[start] < m){
            ++start;
            continue;
        }
        int end = start + 1;
        while(end < n && a[end] >= m){
            ++end;
        }
        int length = end - start;
        maxLength = std::max(length, maxLength);
        ++count;

        start = end;
    }
    std::cout << maxLength << ' ' << count;
}
```

## D. 去极值评分统计

### 题目大意

给出 $n$ 个正整数构成的序列$A$，计算它们去除最大值与最小值之后的平均数 $\text{avg}$，并统计 $A$ 中有多少数严格大于 $\text{avg}$。

### 主要思路

通过一次循环，算出 $\max\{A\}$ 与 $\min\{A\}$，以及 $\sum_{i = 0}^{n -1}{A_i}$ 求出 $\text{avg}$ 后，直接与原数组进行比对。

### AC 代码

```cpp
#include <bits/stdc++.h>
int main(){
    int n;
    std::cin >> n;
    std::vector<int> a(n);
    for(int i =0 ;i < n; ++i){
        std::cin >> a[i];
    }
    int max = a[0], min = a[0], sum = 0;
    for(int i = 0; i < n; ++i){
        max = std::max(a[i], max);
        min = std::min(a[i], min);
        sum += a[i];
    }
    int count = 0;
    double res = (sum - min - max) * 1.0 / (n - 2);
    for(int i  = 0; i < n; ++i){
        if(a[i] > res){
            ++count;
        }
    }
    std::cout << res << ' ' << count;
}
```

## E. 地雷阵探测

### 题目大意

给出 $n \times m$ 的字符矩阵，求出所有 `.` 周围 $8$ 格的 `*` 数量，并按原矩阵形式输出（如果原数组此处是 `*`，输出 `*`）。

### 主要思路

读入原矩阵后，遍历所有的位置。如果是 `.`，就遍历其周遭 $8$ 个位置，计算 `*` 的数量。

### AC 代码

```cpp
#include <bits/stdc++.h>

char a[110][110];
int b[110][110];

int dx[8] = {-1,-1,-1,0,1,1,1,0};
int dy[8] = {-1,0,1,1,1,0,-1,-1};

int main(){
    int n, m;
    std::cin >> n >> m;
    for(int i = 0; i < n; ++i){
        for(int j = 0; j < m; ++j){
            std::cin >> a[i][j];
        }
    }

    for(int i = 0; i < n; ++i){
        for(int j = 0; j < m; ++j){
            if(a[i][j] != '.'){
                continue;
            }
            for(int k = 0; k < 8; ++k){
                int nx = i + dx[k];
                int ny = j + dy[k];
                if((nx >= 0 && ny >= 0 && nx < 100 && ny < 100) && a[nx][ny] == '*'){
                    ++b[i][j];
                }
            }
        }
    }

    for(int i = 0; i < n; ++i){
        for(int j= 0; j < m; ++j){
            if(a[i][j] =='*'){
                std::cout << '*';
            } else{
                std::cout << b[i][j];
            }
        }
        std::cout << '\n';
    }
}
```

## F. 后缀齐步递增

### 题目大意

题目给出长度为 $n$ 的正整数序列 $a$，每次都可以选定下标 $i$ ，使得 $i$ 与 $i$ 下标以后的元素都 $+1$ 。求让 $a$ 严格递增的最小操作次数。

### 主要思路

不难发现，有如下的最终数组的构造思路：

对于 $a_0$，保持不变。以后的每一个数

- 如果大于等于 此前最大值$+1$，就保持不变
- 否则，设置成此前最大值 $+1$

由此构造，可以求出操作次数数组 $b$，代表了每一个数需要 $+1$ 的次数。题目要求求最小，也就是让 $b$ 变为全 $0$ 数组，而这是一个经典问题，可以通过 “求正差分后再求和” 得到答案。

### AC 代码

```cpp
#include <bits/stdc++.h>
#define int long long
signed main(){
    int n;
    std::cin >> n;
    std::vector<int> a(n), b(n);
    for(int i = 0; i < n; ++i){
        std::cin >> a[i];
    }
    int max = a[0] - 1;
    for(int i = 0; i < n; ++i){
        if(a[i] >= max + 1){
            b[i] = 0;
        } else{
            b[i] = max + 1 - a[i];
            a[i] = max + 1;
        }
 
        max = std::max(a[i], max);
    }

    int res= 0;
    for(int i= 1; i< n; ++i){
        res += std::max(0LL, b[i] - b[i - 1]);
    }

    std::cout << res;


    for(int i= 0; i < n; ++i){
        std::cerr << b[i] << ' ';
    }
}
```

## G. 同余子段计数

### 题目大意

题目给出长度为 $n$ 的整数序列 $a$，以及正整数 $k$。要求统计：满足其和可以被 $k$ 整除的连续段 $[L, R]$的数量。

### 主要思路

首先，将题目中的 $a$ 的所有元素都对 $k$ 取余，再求前缀和 $\text{S}$，再对 $S$ 中所有元素对 $k$ 取余数。此时，满足连续段和可以被 $k$ 整除，也就是 $S_i = S_j$。

由于 $k \le 1\times10^5$，可以记录每一个 $S_i$ 的数量。于是，可以直接使用以下公式计算如上所述情况，我们将 $S_i$ 的数量记录在 $C_{S_i}$ 中。
$$
\sum_{i = 0}^{k}\binom{C_i}{2}
$$
而后，$S_i = 0$ 的项也可以直接加到结果里，它们代表 $[0, i]$ 的区间可以被 $k$ 整除。也就是：
$$
\text{result} = \sum_{i = 0}^{k}\binom{C_i}{2} + C_0
$$

### AC 代码

```cpp
#include <bits/stdc++.h>
#define int long long
signed main(){
    int n, k;
    std::cin >> n >> k;
    std::vector<int> a(n);

    for(int i = 0; i < n;++i){
        std::cin >> a[i];
        a[i] = (a[i] % k + k) % k;
    }

    for(int i = 1; i < n; ++i){
        a[i] = (a[i] + a[i - 1]) % k;
    }

    std::vector<int> count(k + 10);

    for(int i = 0; i < n; ++i){
        count[a[i]]++;
    }

    int res = 0;

    for(int  i =0; i <= k; ++i){
        res += (count[i] * (count[i] - 1)) / 2;
    }
    res += count[0];

    std::cout << res;
}
```

