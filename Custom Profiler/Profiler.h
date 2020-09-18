#pragma once

#include <Windows.h>

// Instrumented profiler
struct FuncProfile
{
  FuncProfile(char const *name);
  ~FuncProfile();
};

#define PROFILE() FuncProfile funcProfileName(__FUNCSIG__)

void IncrementFrame();
