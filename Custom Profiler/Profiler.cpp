#include <intrin.h>
#include <fstream>
#include <set>
#include <iostream>
#include <vector>
#include "json/json.h"

#include "Profiler.h"

#pragma instrinsic(__rdtsc)

struct FuncHierarchyMap
{
	//char const *_funcName;
  std::string _funcName;

  long long _funcStartTime;
  long long _funcEndTime;

  std::vector<FuncHierarchyMap> _children;
  FuncHierarchyMap *_parent;

  unsigned long long _frame;

  FuncHierarchyMap() : _funcName(), _funcStartTime(0L), _funcEndTime(0L),
    _children(), _parent(nullptr), _frame(0UL)
  {}

  FuncHierarchyMap(char const *name, long long start, FuncHierarchyMap *parent,
    unsigned long long frame) :
    _funcName(name), _funcStartTime(start), _funcEndTime(start), _children(),
    _parent(parent), _frame(frame)
  {
    // clean up the function string
    std::string cdeclStr = "__cdecl";

    size_t pos = _funcName.find(cdeclStr);
    std::string retType = _funcName.substr(0, pos);
    size_t whitespace = _funcName.find_first_of(' ', pos);
    std::string fname = _funcName.substr(whitespace + 1);

    _funcName = retType + fname;
  }

  Json::Value ToJson() const
  {
    Json::Value value(Json::objectValue);

    if (!_children.empty())
    {
      Json::Value childFunctions(Json::arrayValue);

      for (int i = 0; i < _children.size(); ++i)
        childFunctions.append(_children[i].ToJson());

      value["childFunctions"] = childFunctions;
    }

    value["frameNum"] = _frame + 1;
    value["funcName"] = _funcName;
    value["funcTime"] = _funcEndTime - _funcStartTime;

    return value;
  }
};

static struct FuncRegistry
{
  std::ofstream _outFile;                    // output file

  std::vector<FuncHierarchyMap> _funcMap;  // current profiles listed
  FuncHierarchyMap *_lastFunc;               // last function called

  char const *_prevName;                     // previously encountered function
                                             
  long long _programStartTime;               // time since program started
  long long _programEndTime;                 // time when program ends

  unsigned long long _frame;                 // frame and index of the function hierarchy

  FuncRegistry() : _outFile("Profiler.json", std::ios_base::out), _funcMap(),
    _lastFunc(nullptr), _prevName(nullptr), _programStartTime(0), _programEndTime(0),
    _frame(0UL)
  {
    QueryPerformanceCounter(reinterpret_cast<LARGE_INTEGER *>(&_programStartTime));
  }

  void Enter(char const *name)
  {
    long long dt = 0L;
    QueryPerformanceCounter(reinterpret_cast<LARGE_INTEGER *>(&dt));

    if (_funcMap.empty() || _frame >= _funcMap.size()) // first function made
    {
      _funcMap.push_back(FuncHierarchyMap(name, dt, nullptr, _frame));
      _lastFunc = &_funcMap[_frame];
    }
    else // another child function has been made
    {
      _lastFunc->_children.push_back(FuncHierarchyMap(name, dt, _lastFunc, _frame));
      _lastFunc = &_lastFunc->_children.back();
    }
  }

  void Exit()
  {
    QueryPerformanceCounter(reinterpret_cast<LARGE_INTEGER *>(&_lastFunc->_funcEndTime));
    _lastFunc = _lastFunc->_parent;
  }

  void PrintJSON()
  {
    Json::Value frames = Json::Value(Json::objectValue);
    frames["profileRunTime"] = _programEndTime - _programStartTime;

    for (int i = 0; i < _funcMap.size(); ++i)
      frames["frameData"].append(_funcMap[i].ToJson());

    _outFile << frames;
  }

  ~FuncRegistry()
  {
    // get the time the frame ends
    QueryPerformanceCounter(reinterpret_cast<LARGE_INTEGER *>(&registry._programEndTime));

    // print all JSON to file
    PrintJSON();

    _outFile.close();
  }
} registry;


FuncProfile::FuncProfile(char const *name)
{
  registry.Enter(name);
}

FuncProfile::~FuncProfile()
{
  registry.Exit();
}

void IncrementFrame()
{
  registry._frame++;
}
